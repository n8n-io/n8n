import {
	AgentIntegrationSchema,
	isDraftIntegration,
	type AgentIntegrationConfig,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { EventService } from '@/events/event.service';

import {
	AgentModificationTelemetryService,
	diffAgentConfigParts,
	isUnconfiguredAgent,
	type AgentActor,
} from './agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { markAgentDraftDirty } from './utils/agent-draft.utils';

export interface CredentialIntegrationMutationContext {
	user: User;
	modifiedBy: AgentActor;
	broadcast?: boolean;
}

@Service()
export class AgentIntegrationPersistenceService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly runtimeCacheService: AgentRuntimeCacheService,
		private readonly chatIntegrationRegistry: ChatIntegrationRegistry,
		private readonly eventService: EventService,
		private readonly modificationTelemetry: AgentModificationTelemetryService,
		private readonly credentialsService: CredentialsService,
		private readonly setupCompletionService: AgentSetupCompletionService,
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
		context: CredentialIntegrationMutationContext,
	): Promise<Agent> {
		const parseResult = AgentIntegrationSchema.safeParse(integration);
		if (!parseResult.success) {
			throw new UserError(`Invalid credential integration: ${parseResult.error.message}`);
		}
		const validated = parseResult.data;
		const { type, credentialId } = validated;

		if (isDraftIntegration(validated)) {
			throw new UserError('Credential integration requires a credential ID.');
		}

		const previousSchema = agent.schema ?? null;
		const previousIntegrations = agent.integrations ?? [];
		const wasUnconfigured = isUnconfiguredAgent(previousSchema, previousIntegrations);

		// Drop a same-type draft entry (empty credentialId, written by the builder
		// before setup completes) so connecting a real credential replaces it
		// instead of leaving both the draft and the connected entry behind.
		const existing = previousIntegrations.filter(
			(i) => !(i.type === type && isDraftIntegration(i)),
		);
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
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			agent.projectId,
			context.user,
		);
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			agent,
			agent.projectId,
			credentialProvider,
			context.user,
		);
		const result = await this.agentRepository.save(agent);
		this.eventService.emit('agent-saved', { agentId: agent.id });
		await emitSetupCompleted?.();
		await this.recordIntegrationMutation(
			result,
			previousSchema,
			previousIntegrations,
			context,
			wasUnconfigured,
		);
		if (context.broadcast !== false) {
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
		context: CredentialIntegrationMutationContext,
	): Promise<Agent> {
		if (!agent.integrations?.length) return agent;
		const integration = agent.integrations.find(
			(i) => i.type === type && i.credentialId === credentialId,
		);
		if (!integration) return agent;

		const previousSchema = agent.schema ?? null;
		const previousIntegrations = agent.integrations ?? [];
		const wasUnconfigured = isUnconfiguredAgent(previousSchema, previousIntegrations);

		agent.integrations = agent.integrations.filter((i) => i !== integration);

		markAgentDraftDirty(agent);
		this.runtimeCacheService.clearRuntimes(agent.id);
		const result = await this.agentRepository.save(agent);
		this.eventService.emit('agent-saved', { agentId: agent.id });
		await this.recordIntegrationMutation(
			result,
			previousSchema,
			previousIntegrations,
			context,
			wasUnconfigured,
		);
		if (context.broadcast !== false) {
			await this.chatIntegrationService.broadcastIntegrationChange(
				agent.id,
				integration,
				'disconnect',
			);
		}
		return result;
	}

	private async recordIntegrationMutation(
		agent: Agent,
		previousSchema: Agent['schema'],
		previousIntegrations: AgentIntegrationConfig[],
		context: CredentialIntegrationMutationContext,
		wasUnconfigured: boolean,
	): Promise<void> {
		this.modificationTelemetry.record({
			agent,
			projectId: agent.projectId,
			user: context.user,
			by: context.modifiedBy,
			changedParts: diffAgentConfigParts(
				previousSchema,
				agent.schema,
				previousIntegrations,
				agent.integrations ?? [],
			),
			wasUnconfigured,
		});
	}
}
