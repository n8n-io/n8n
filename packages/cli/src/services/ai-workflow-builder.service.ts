import { AiWorkflowBuilderService, createPassthroughSsrfGuard } from '@n8n/ai-workflow-builder';
import type {
	ResourceLocatorCallbackFactory,
	BuilderModelConfig,
	BuilderProvider,
} from '@n8n/ai-workflow-builder';
import { ChatPayload } from '@n8n/ai-workflow-builder/dist/workflow-builder-agent';
import { agentBuilderAdminSettingsSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import * as fs from 'fs';
import { jsonParse } from 'n8n-workflow';
import type {
	INodeCredentials,
	INodeParameters,
	INodeTypeNameVersion,
	IUser,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import * as path from 'path';

import { N8N_VERSION } from '@/constants';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

/** Persisted admin settings key shared with the agent builder. */
const AGENT_BUILDER_SETTINGS_KEY = 'agentBuilder.settings';

/** Map an admin-settings provider id onto a provider the workflow builder supports. */
function toBuilderProvider(provider: string): BuilderProvider | undefined {
	if (provider === 'openai') return 'openai';
	if (provider === 'anthropic') return 'anthropic';
	if (provider.startsWith('google')) return 'google';
	return undefined;
}
import { WorkflowBuilderSessionRepository } from '@/modules/workflow-builder';
import { Push } from '@/push';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';

import { InstanceSettings, SsrfProtectionService } from 'n8n-core';

import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { getBase } from '@/workflow-execute-additional-data';

/**
 * This service wraps the actual AiWorkflowBuilderService to avoid circular dependencies.
 * Instead of extending, we're delegating to the real service which is created on-demand.
 */
@Service()
export class WorkflowBuilderService {
	private service: AiWorkflowBuilderService | undefined;

	private client: AiAssistantClient | undefined;

	private initPromise: Promise<AiWorkflowBuilderService> | undefined;

	constructor(
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly license: License,
		private readonly config: GlobalConfig,
		private readonly logger: Logger,
		private readonly urlService: UrlService,
		private readonly push: Push,
		private readonly telemetry: Telemetry,
		private readonly instanceSettings: InstanceSettings,
		private readonly dynamicNodeParametersService: DynamicNodeParametersService,
		private readonly sessionRepository: WorkflowBuilderSessionRepository,
		private readonly ssrfConfig: SsrfProtectionConfig,
		private readonly ssrfProtectionService: SsrfProtectionService,
		private readonly settingsRepository: SettingsRepository,
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {
		// Register a post-processor to update node types when they change.
		// This ensures newly installed/updated/uninstalled community packages are recognized
		// while preserving existing sessions.
		this.loadNodesAndCredentials.addPostProcessor(async () => await this.refreshNodeTypes());
	}

	/**
	 * Update the node types on the existing service instance.
	 * Called automatically when postProcessLoaders() runs (e.g., after community package changes).
	 * This preserves existing sessions while making new node types available.
	 */
	async refreshNodeTypes() {
		if (this.service) {
			const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();
			this.service.updateNodeTypes(nodeTypeDescriptions);
		}
	}

	private async getService(): Promise<AiWorkflowBuilderService> {
		if (this.service) return this.service;

		this.initPromise ??= this.initializeService();

		return await this.initPromise;
	}

	private async initializeService(): Promise<AiWorkflowBuilderService> {
		// Create AiAssistantClient if baseUrl is configured
		const baseUrl = this.config.aiAssistant.baseUrl;
		if (baseUrl) {
			const licenseCert = await this.license.loadCertStr();
			const consumerId = this.license.getConsumerId();

			this.client = new AiAssistantClient({
				licenseCert,
				consumerId,
				baseUrl,
				n8nVersion: N8N_VERSION,
				instanceId: this.instanceSettings.instanceId,
			});

			// Register for license certificate updates
			this.license.onCertRefresh((cert) => {
				this.client?.updateLicenseCert(cert);
			});
		}

		// Create callback that uses the push service
		const onCreditsUpdated = (userId: string, creditsQuota: number, creditsClaimed: number) => {
			this.push.sendToUsers(
				{
					type: 'updateBuilderCredits',
					data: {
						creditsQuota,
						creditsClaimed,
					},
				},
				[userId],
			);
		};

		// Callback for AI Builder to send telemetry events
		const onTelemetryEvent = (event: string, properties: ITelemetryTrackProperties) => {
			this.telemetry.track(event, properties);
		};

		// Factory for creating resource locator callbacks scoped to a user
		const resourceLocatorCallbackFactory: ResourceLocatorCallbackFactory = (userId: string) => {
			return async (
				methodName: string,
				path: string,
				nodeTypeAndVersion: INodeTypeNameVersion,
				currentNodeParameters: INodeParameters,
				credentials?: INodeCredentials,
				filter?: string,
				paginationToken?: string,
			) => {
				const additionalData = await getBase({
					userId,
					currentNodeParameters,
				});

				return await this.dynamicNodeParametersService.getResourceLocatorResults(
					methodName,
					path,
					additionalData,
					nodeTypeAndVersion,
					currentNodeParameters,
					credentials,
					filter,
					paginationToken,
				);
			};
		};

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = await this.loadNodesAndCredentials.collectTypes();

		// web_fetch SSRF protection is gated on the global flag, consistent with the rest
		// of n8n. When disabled, a passthrough guard is used (the domain-approval/HITL
		// layer in the tool still applies).
		const ssrfGuard = this.ssrfConfig.enabled
			? this.ssrfProtectionService
			: createPassthroughSsrfGuard();

		this.service = new AiWorkflowBuilderService(
			nodeTypeDescriptions,
			this.sessionRepository,
			this.client,
			this.logger,
			this.instanceSettings.instanceId,
			this.urlService.getInstanceBaseUrl(),
			N8N_VERSION,
			onCreditsUpdated,
			onTelemetryEvent,
			this.resolveBuiltinNodeDefinitionDirs(),
			resourceLocatorCallbackFactory,
			ssrfGuard,
		);

		return this.service;
	}

	private resolveBuiltinNodeDefinitionDirs(): string[] {
		const dirs: string[] = [];
		for (const packageId of ['n8n-nodes-base', '@n8n/n8n-nodes-langchain']) {
			try {
				const packageJsonPath = require.resolve(`${packageId}/package.json`);
				const distDir = path.dirname(packageJsonPath);
				const nodeDefsDir = path.join(distDir, 'dist', 'node-definitions');
				if (fs.existsSync(nodeDefsDir)) {
					dirs.push(nodeDefsDir);
				}
			} catch {
				// Package not installed, skip
			}
		}
		return dirs;
	}

	/**
	 * Resolve which provider + API key the workflow builder should run on.
	 *
	 * Priority:
	 *   1. Managed AI proxy (n8n Cloud) — keeps its existing Anthropic path.
	 *   2. In-app admin setting (Agent Builder → custom credential) — any of
	 *      Anthropic / OpenAI / Google, with the key entered in the app.
	 *   3. Env-var keys for OpenAI / Google (Anthropic env is handled downstream).
	 *
	 * Returns `undefined` to let the underlying service use its default
	 * (proxy or `N8N_AI_ANTHROPIC_KEY`) behaviour.
	 */
	private async resolveModelOverride(): Promise<BuilderModelConfig | undefined> {
		if (this.client) return undefined;

		const fromSettings = await this.resolveModelFromSettings();
		if (fromSettings) return fromSettings;

		return this.resolveModelFromEnv();
	}

	private async resolveModelFromSettings(): Promise<BuilderModelConfig | undefined> {
		try {
			const row = await this.settingsRepository.findByKey(AGENT_BUILDER_SETTINGS_KEY);
			if (!row) return undefined;

			const parsed = agentBuilderAdminSettingsSchema.safeParse(
				jsonParse<unknown>(row.value, { fallbackValue: undefined }),
			);
			if (!parsed.success || parsed.data.mode !== 'custom') return undefined;

			const provider = toBuilderProvider(parsed.data.provider);
			if (!provider) {
				this.logger.warn(
					`Workflow builder: provider "${parsed.data.provider}" is not supported, ignoring custom model settings`,
				);
				return undefined;
			}

			const credential = await this.credentialsFinderService.findCredentialById(
				parsed.data.credentialId,
			);
			if (!credential) return undefined;

			const data = await this.credentialsService.decrypt(credential, true);
			const apiKey = typeof data.apiKey === 'string' ? data.apiKey : undefined;
			if (!apiKey) return undefined;

			const baseUrl =
				typeof data.url === 'string'
					? data.url
					: typeof data.baseUrl === 'string'
						? data.baseUrl
						: undefined;

			return { provider, apiKey, model: parsed.data.modelName, baseUrl };
		} catch (error) {
			this.logger.warn('Workflow builder: failed to resolve in-app model settings', { error });
			return undefined;
		}
	}

	private resolveModelFromEnv(): BuilderModelConfig | undefined {
		const openAiKey = process.env.N8N_AI_OPENAI_KEY;
		if (openAiKey) return { provider: 'openai', apiKey: openAiKey };

		const googleKey = process.env.N8N_AI_GOOGLE_KEY;
		if (googleKey) return { provider: 'google', apiKey: googleKey };

		return undefined;
	}

	async *chat(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		const service = await this.getService();
		const modelOverride = await this.resolveModelOverride();
		yield* service.chat(payload, user, abortSignal, modelOverride);
	}

	async getSessions(workflowId: string | undefined, user: IUser, isCodeBuilder?: boolean) {
		const service = await this.getService();
		const sessions = await service.getSessions(workflowId, user, isCodeBuilder);
		return sessions;
	}

	async getBuilderInstanceCredits(user: IUser) {
		const service = await this.getService();
		return await service.getBuilderInstanceCredits(user);
	}

	async clearSession(workflowId: string, user: IUser): Promise<void> {
		const service = await this.getService();
		await service.clearSession(workflowId, user);
	}

	async truncateMessagesAfter(
		workflowId: string,
		user: IUser,
		messageId: string,
		versionCardId?: string,
	): Promise<boolean> {
		const service = await this.getService();
		return await service.truncateMessagesAfter(workflowId, user, messageId, versionCardId);
	}
}
