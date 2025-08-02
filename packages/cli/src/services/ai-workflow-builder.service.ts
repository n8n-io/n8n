import { AiWorkflowBuilderService } from '@n8n/ai-workflow-builder';
import { ChatPayload } from '@n8n/ai-workflow-builder/dist/workflow-builder-agent';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { AiAssistantClient } from '@n8n_io/ai-assistant-sdk';
import type { IUser } from 'n8n-workflow';

import { N8N_VERSION } from '@/constants';
import { License } from '@/license';
import { NodeTypes } from '@/node-types';

/**
 * This service wraps the actual AiWorkflowBuilderService to avoid circular dependencies.
 * Instead of extending, we're delegating to the real service which is created on-demand.
 */
@Service()
export class WorkflowBuilderService {
	private service: AiWorkflowBuilderService | undefined;

	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly license: License,
		private readonly config: GlobalConfig,
		private readonly logger: Logger,
	) {}

	private async getService(): Promise<AiWorkflowBuilderService> {
		if (!this.service) {
			let client: AiAssistantClient | undefined;

			// Create AiAssistantClient if baseUrl is configured
			const baseUrl = this.config.aiAssistant.baseUrl;
			if (baseUrl) {
				const licenseCert = await this.license.loadCertStr();
				const consumerId = this.license.getConsumerId();

				client = new AiAssistantClient({
					licenseCert,
					consumerId,
					baseUrl,
					n8nVersion: N8N_VERSION,
				});
			}

			this.service = new AiWorkflowBuilderService(this.nodeTypes, client, this.logger);
		}
		return this.service;
	}

	async *chat(payload: ChatPayload, user: IUser) {
		const service = await this.getService();
		yield* service.chat(payload, user);
	}

	async getSessions(workflowId: string | undefined, user: IUser) {
		const service = await this.getService();
		const sessions = await service.getSessions(workflowId, user);
		return sessions;
	}
}
