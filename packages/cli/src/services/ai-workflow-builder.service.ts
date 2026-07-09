import { AiWorkflowBuilderService, createPassthroughSsrfGuard } from '@n8n/ai-workflow-builder';
import type { ResourceLocatorCallbackFactory } from '@n8n/ai-workflow-builder';
import { ChatPayload } from '@n8n/ai-workflow-builder/dist/workflow-builder-agent';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp, SsrfProtectionService } from '@n8n/backend-network';
import { GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import * as fs from 'fs';
import { InstanceSettings } from 'n8n-core';
import type {
	INodeCredentials,
	INodeParameters,
	INodeTypeNameVersion,
	IUser,
	ITelemetryTrackProperties,
} from 'n8n-workflow';
import * as path from 'path';

import { N8N_VERSION } from '@/constants';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { WorkflowBuilderSessionRepository } from '@/modules/workflow-builder';
import { Push } from '@/push';
import { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';
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
		private readonly outboundHttp: OutboundHttp,
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

		// web_fetch SSRF protection is gated on the global configuration.
		const webFetchSsrfGuard = this.ssrfConfig.enabled
			? this.ssrfProtectionService
			: createPassthroughSsrfGuard();

		// The destination is a fixed, trusted AI provider endpoint, never a user-
		// or LLM-controlled URL, so SSRF stays disabled. (web_fetch, which does
		// fetch arbitrary URLs, is guarded separately.) Sharing `createAiProxyFetch`
		// also applies the long AI timeout so workflow generation is not cut off at
		// undici's 5-minute default.
		const modelFetch = createAiProxyFetch(this.outboundHttp);

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
			webFetchSsrfGuard,
			modelFetch,
		);

		return this.service;
	}

	private resolveBuiltinNodeDefinitionDirs(): string[] {
		const dirs: string[] = [];
		for (const packageId of BUILTIN_NODES_PACKAGES) {
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

	async *chat(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		const service = await this.getService();
		yield* service.chat(payload, user, abortSignal);
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
