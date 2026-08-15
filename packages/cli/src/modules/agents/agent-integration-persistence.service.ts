import {
	AgentIntegrationSchema,
	isDraftIntegration,
	type AgentIntegrationConfig,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

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
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';

export interface CredentialIntegrationMutationContext {
	user: User;
	modifiedBy: AgentActor;
}

/** Reference to a persisted entry; `credentialId: ''` targets a builder draft entry. */
export interface IntegrationRef {
	type: string;
	credentialId: string;
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

export function matchesIntegrationRef(
	integration: { type: string; credentialId: string },
	ref: IntegrationRef,
): boolean {
	return integration.type === ref.type && integration.credentialId === ref.credentialId;
}

/**
 * Project the next `integrations` array. Removal runs first so replacing a
 * credential can drop the old entry and add the new one in the same array.
 */
function projectIntegrations(
	current: AgentIntegrationConfig[],
	delta: { add?: AgentIntegrationConfig; remove?: IntegrationRef },
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

	return next.some((entry) => matchesIntegrationRef(entry, add))
		? next.map((entry) => (matchesIntegrationRef(entry, add) ? add : entry))
		: [...next, add];
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
	 * The delta is projected onto the freshly read column and only
	 * `integrations`/`versionId` are written, so it can neither clobber unrelated
	 * columns nor lose a concurrent channel change; a lost compare-and-set retries
	 * against a fresh read. Runtime connections are the caller's concern, and
	 * anything observable outside the row waits until the write has landed.
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
			const state = await this.agentRepository.findIntegrationState(agent.id);
			if (!state) throw new UserError(`Agent "${agent.id}" no longer exists`);

			const current = state.integrations ?? [];
			const removed = remove
				? current.find((entry) => matchesIntegrationRef(entry, remove))
				: undefined;

			const published = state.activeVersionId !== null;
			// Callers derive their response and their runtime decisions from the
			// entity, so correct it to what was read. Scalar only — nothing here reads
			// the `activeVersion` relation, and fabricating one would be worse.
			agent.activeVersionId = state.activeVersionId;

			// A removal of something already gone is not a failure — and with
			// nothing to add there is no write left to make.
			if (!add && !removed) {
				agent.integrations = current;
				agent.versionId = state.versionId;
				return { agent, changed: false, published };
			}

			const integrations = projectIntegrations(current, { add, remove });
			// Always fresh: `versionId` is the compare-and-set token, so writing back
			// the value we guarded on would let two concurrent writes both match.
			// Consumers only compare it to `activeVersionId`, which a rotation keeps.
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
				{ versionId: state.versionId, activeVersionId: state.activeVersionId },
				versionId,
			);
			if (!written) continue;

			agent.versionId = versionId;
			this.runtimeCacheService.clearRuntimes(agent.id);
			this.eventService.emit('agent-saved', { agentId: agent.id });
			await emitSetupCompleted?.();
			this.recordIntegrationMutation(agent, current, context);

			return { agent, changed: true, published, ...(removed ? { removed } : {}) };
		}

		throw new OperationalError(
			`Could not update channels for agent "${agent.id}" — the agent kept changing underneath the write`,
		);
	}

	/** Reject anything that must never reach the `integrations` column. */
	private validateAddition(integration: AgentIntegrationConfig): AgentIntegrationConfig {
		const parseResult = AgentIntegrationSchema.safeParse(integration);
		if (!parseResult.success) {
			throw new UserError(`Invalid credential integration: ${parseResult.error.message}`);
		}
		if (isDraftIntegration(parseResult.data)) {
			throw new UserError('Credential integration requires a credential ID.');
		}
		return parseResult.data;
	}

	private recordIntegrationMutation(
		agent: Agent,
		previousIntegrations: AgentIntegrationConfig[],
		context: CredentialIntegrationMutationContext,
	): void {
		// The schema is not re-read — it is not part of this write, and the entity
		// copy is only used to classify the change for telemetry.
		const previousSchema = agent.schema ?? null;
		const wasUnconfigured = isUnconfiguredAgent(previousSchema, previousIntegrations);
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
