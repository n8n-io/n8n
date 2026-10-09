import {
	AgentIntegrationConfigSchema,
	isDraftIntegration,
	type AgentIntegrationConfig,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsService } from '@/credentials/credentials.service';

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
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import type { IntegrationRef } from './utils/agent-channel';

export interface CredentialIntegrationMutationContext {
	user: User;
	modifiedBy: AgentActor;
}

/**
 * One durable change to an agent's channels. Both fields together are a
 * replacement, and land in one write so a swap can't leave two entries or none.
 */
export interface IntegrationDelta {
	add?: AgentIntegrationConfig;
	remove?: IntegrationRef;
}

export interface IntegrationDeltaResult {
	agent: Agent;
	/** False when the delta was already satisfied — nothing was written. */
	changed: boolean;
	/** The entry that was actually removed, for the caller's runtime teardown. */
	removed?: AgentIntegrationConfig;
	/**
	 * Publication state of the row this was applied to. The caller's own copy can
	 * predate a concurrent publish or unpublish; this cannot. `undefined` when no
	 * row was read.
	 */
	published?: boolean;
}

/** Retries cover a lost compare-and-set, which needs a fresh read to resolve. */
const MAX_WRITE_ATTEMPTS = 3;

export function matchesIntegrationRef(integration: IntegrationRef, ref: IntegrationRef): boolean {
	return integration.type === ref.type && integration.credentialId === ref.credentialId;
}

/**
 * Project the next `integrations` array. Removal runs first so replacing a
 * credential can drop the old entry and add the new one in the same array.
 */
function projectIntegrations(
	current: AgentIntegrationConfig[],
	delta: IntegrationDelta,
): AgentIntegrationConfig[] {
	let next = delta.remove
		? current.filter((entry) => !matchesIntegrationRef(entry, delta.remove!))
		: [...current];

	const { add } = delta;
	if (!add) return next;

	// Drop a same-type draft entry (empty credentialId, written by the builder
	// before setup completes) so connecting a real credential replaces it
	// instead of leaving both the draft and the connected entry behind.
	next = next.filter((entry) => !(entry.type === add.type && isDraftIntegration(entry)));

	if (!next.some((entry) => matchesIntegrationRef(entry, add))) return [...next, add];
	return next.map((entry) => (matchesIntegrationRef(entry, add) ? add : entry));
}

@Service()
export class AgentIntegrationPersistenceService {
	constructor(
		private readonly agentRepository: AgentRepository,
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
			approvableActions: i.actionToolDefinitions.map(({ name, sensitive }) => ({
				name,
				sensitive: sensitive === true,
			})),
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
	 * Apply one durable change to an agent's channels.
	 *
	 * Apply the delta to the current draft and advance its revision.
	 * Retry a lost compare-and-set with fresh state for setup validation.
	 * Leave runtime connections to the caller. Emit effects after the write.
	 */
	async applyIntegrationDelta(
		agent: Agent,
		delta: IntegrationDelta,
		context: CredentialIntegrationMutationContext,
	): Promise<IntegrationDeltaResult> {
		const add = delta.add ? this.validateAddition(delta.add) : undefined;
		// Replacing an entry with itself removes nothing. Reporting it as removed
		// would have the caller tear down the channel this write keeps.
		const remove =
			delta.remove && add && matchesIntegrationRef(add, delta.remove) ? undefined : delta.remove;
		if (!add && !remove) return { agent, changed: false };

		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			agent.projectId,
			context.user,
		);

		for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
			const result = await this.applyIntegrationAttempt(
				agent,
				{ add, remove },
				context,
				credentialProvider,
			);
			if (result) return result;
		}

		throw new OperationalError(
			`Could not update channels for agent "${agent.id}" — the agent kept changing underneath the write`,
		);
	}

	/**
	 * Reject anything that must never reach the `integrations` column. The config
	 * schema also covers n8n Chat; `isDraftIntegration` still rejects a blank credential.
	 */
	private validateAddition(integration: AgentIntegrationConfig): AgentIntegrationConfig {
		const parseResult = AgentIntegrationConfigSchema.safeParse(integration);
		if (!parseResult.success) {
			throw new UserError(`Invalid credential integration: ${parseResult.error.message}`);
		}
		if (isDraftIntegration(parseResult.data)) {
			throw new UserError('Credential integration requires a credential ID.');
		}
		return parseResult.data;
	}

	private async recordIntegrationMutation(
		agent: Agent,
		previousIntegrations: AgentIntegrationConfig[],
		context: CredentialIntegrationMutationContext,
	): Promise<void> {
		const previousSchema = agent.schema ?? null;
		const wasUnconfigured = isUnconfiguredAgent(previousSchema, previousIntegrations);
		await this.modificationTelemetry.record({
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
	private async applyIntegrationAttempt(
		agent: Agent,
		{ add, remove }: IntegrationDelta,
		context: CredentialIntegrationMutationContext,
		credentialProvider: ReturnType<typeof createAgentCredentialProvider>,
	): Promise<IntegrationDeltaResult | undefined> {
		const state = await this.agentRepository.findById(agent.id);
		if (!state) throw new UserError(`Agent "${agent.id}" no longer exists`);
		// Setup validation must use the definition that belongs to this revision.
		Object.assign(agent, state);

		const current = state.integrations ?? [];
		const removed = remove
			? current.find((entry) => matchesIntegrationRef(entry, remove))
			: undefined;

		const published = state.activeVersionId !== null;

		// A removal of something already gone is not a failure — and with
		// nothing to add there is no write left to make.
		if (!add && !removed) {
			return { agent, changed: false, published };
		}

		const integrations = projectIntegrations(current, { add, remove });
		const written = await this.persistIntegrations(
			agent,
			integrations,
			state,
			context,
			credentialProvider,
		);
		if (!written) return undefined;
		this.runtimeCacheService.clearRuntimes(agent.id);
		this.eventService.emit('agent-saved', { agentId: agent.id });
		await written.emitSetupCompleted?.();
		await this.recordIntegrationMutation(agent, current, context);

		return { agent, changed: true, published, ...(removed ? { removed } : {}) };
	}

	private async persistIntegrations(
		agent: Agent,
		integrations: AgentIntegrationConfig[],
		state: Pick<Agent, 'revision' | 'versionId' | 'activeVersionId'>,
		context: CredentialIntegrationMutationContext,
		credentialProvider: ReturnType<typeof createAgentCredentialProvider>,
	) {
		// Keep each channel change distinct from the published version.
		const versionId = uuid();

		// Gate evaluated against the state about to be written; the marker is
		// claimed and reported only once that write succeeded.
		agent.integrations = integrations;
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			agent,
			agent.projectId,
			credentialProvider,
			context.user,
		);

		const written = await this.agentRepository.updateIntegrations(
			agent.id,
			integrations,
			{
				revision: state.revision,
				versionId: state.versionId,
				activeVersionId: state.activeVersionId,
			},
			versionId,
		);
		if (!written) return undefined;

		agent.versionId = versionId;
		agent.revision = state.revision + 1;
		return { emitSetupCompleted };
	}
}
