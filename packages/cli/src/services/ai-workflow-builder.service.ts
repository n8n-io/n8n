import { AiWorkflowBuilderService } from '@n8n/ai-workflow-builder';
import { ChatPayload } from '@n8n/ai-workflow-builder/dist/workflow-builder-agent';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import { InstanceSettings } from 'n8n-core';
import type { IUser } from 'n8n-workflow';
import { ITelemetryTrackProperties } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

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
	) {}

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

		await this.loadNodesAndCredentials.postProcessLoaders();
		const { nodes: nodeTypeDescriptions } = this.loadNodesAndCredentials.types;
		this.loadNodesAndCredentials.releaseTypes();

		this.service = new AiWorkflowBuilderService(
			nodeTypeDescriptions,
			this.client,
			this.logger,
			this.instanceSettings.instanceId,
			this.urlService.getInstanceBaseUrl(),
			N8N_VERSION,
			onCreditsUpdated,
			onTelemetryEvent,
		);

		return this.service;
	}

	async *chat(payload: ChatPayload, user: IUser, abortSignal?: AbortSignal) {
		const service = await this.getService();
		yield* service.chat(payload, user, abortSignal);
	}

	async getSessions(workflowId: string | undefined, user: IUser) {
		const service = await this.getService();
		const sessions = await service.getSessions(workflowId, user);
		return sessions;
	}

	async getBuilderInstanceCredits(user: IUser) {
		const service = await this.getService();
		return await service.getBuilderInstanceCredits(user);
	}

	async truncateMessagesAfter(
		workflowId: string,
		user: IUser,
		messageId: string,
	): Promise<boolean> {
		const service = await this.getService();
		return await service.truncateMessagesAfter(workflowId, user, messageId);
	}
}
