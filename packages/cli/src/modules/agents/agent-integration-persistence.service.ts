import {
	AgentIntegrationSchema,
	type AgentIntegrationConfig,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';
import { markAgentDraftDirty } from './utils/agent-draft.utils';

export interface SaveCredentialIntegrationOptions {
	broadcast?: boolean;
}

@Service()
export class AgentIntegrationPersistenceService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
	) {}

	/**
	 * Return the list of registered chat platform integrations with their
	 * FE display metadata. Used by `GET /agents/integrations`.
	 */
	listChatIntegrations(): ChatIntegrationDescriptor[] {
		return this.chatIntegrationRegistry.listPublic().map((i) => ({
			type: i.type,
			label: i.displayLabel,
			icon: i.displayIcon,
			credentialTypes: i.credentialTypes,
			...(i.builderGuidance
				? {
						capabilities: i.builderGuidance.capabilities,
						useIntegrationWhen: i.builderGuidance.useIntegrationWhen,
						useNodeToolWhen: i.builderGuidance.useNodeToolWhen,
					}
				: {}),
		}));
	}

	/**
	 * Persist a credential integration on the agent after validation.
	 * Replaces an existing entry with the same type+credentialId or appends a new one.
	 */
	async saveCredentialIntegration(
		agent: Agent,
		integration: AgentIntegrationConfig,
		options: SaveCredentialIntegrationOptions = {},
	): Promise<Agent> {
		const parseResult = AgentIntegrationSchema.safeParse(integration);
		if (!parseResult.success) {
			throw new UserError(`Invalid credential integration: ${parseResult.error.message}`);
		}
		const validated = parseResult.data;
		const { type, credentialId } = validated;

		if (credentialId === '') {
			throw new UserError('Credential integration requires a credential ID.');
		}

		const existing = agent.integrations ?? [];
		const alreadyExists = existing.some((i) => i.type === type && i.credentialId === credentialId);

		agent.integrations = alreadyExists
			? existing.map((existingIntegration) =>
					existingIntegration.type === type && existingIntegration.credentialId === credentialId
						? validated
						: existingIntegration,
				)
			: [...existing, validated];

		markAgentDraftDirty(agent);
		this.runtimeCacheService.clearRuntimes(agent.id);
		const result = await this.agentRepository.save(agent);
		if (options.broadcast !== false) {
			await this.chatIntegrationService.broadcastIntegrationChange(
				agent.id,
				integration,
				'connect',
			);
		}
		return result;
	}

	/**
	 * Remove a credential integration from the agent.
	 */
	async removeCredentialIntegration(
		agent: Agent,
		type: string,
		credentialId: string,
	): Promise<Agent> {
		if (!agent.integrations?.length) return agent;
		const integration = agent.integrations.find(
			(i) => i.type === type && i.credentialId === credentialId,
		);
		if (!integration) return agent;
		agent.integrations = agent.integrations.filter((i) => i !== integration);

		markAgentDraftDirty(agent);
		this.runtimeCacheService.clearRuntimes(agent.id);
		const result = await this.agentRepository.save(agent);
		await this.chatIntegrationService.broadcastIntegrationChange(
			agent.id,
			integration,
			'disconnect',
		);
		return result;
	}
}
