import {
	AgentIntegrationConfigSchema,
	isDraftIntegration,
	type AgentIntegrationConfig,
	type ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import { OperationalError, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsService } from '@/credentials/credentials.service';

import {
	AgentModificationTelemetryService,
	buildAgentMutationEvent,
	captureAgentMutation,
	type AgentActor,
} from './agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentSetupCompletionService } from './agent-setup-completion.service';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { Agent } from './entities/agent.entity';
import type { AgentSkillRefs } from './json-config/agent-document';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { AgentRepository } from './repositories/agent.repository';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import { matchesIntegrationRef, type IntegrationRef } from './utils/agent-channel';
import { AgentChannelSetupService } from './agent-channel-setup.service';
import {
	assertChannelSetupReference,
	cancelChannelSetup,
	completeChannelSetup,
	getDraftIntegrations,
	projectChannelSetup,
	type AgentChannelState,
} from './utils/agent-channel-setup';

export { matchesIntegrationRef } from './utils/agent-channel';

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
	setupId?: string;
	request?: { integration: AgentIntegrationConfig; replaces?: IntegrationRef };
	cancelSetup?: { setupId: string; type: string };
}

export interface IntegrationDeltaResult {
	agent: Agent;
	/** False when the delta was already satisfied — nothing was written. */
	changed: boolean;
	/** The entry that was actually removed, for the caller's runtime teardown. */
	removed?: AgentIntegrationConfig;
	removedIntegrations?: AgentIntegrationConfig[];
	/**
	 * Publication state of the row this was applied to. The caller's own copy can
	 * predate a concurrent publish or unpublish; this cannot. `undefined` when no
	 * row was read.
	 */
	published?: boolean;
}

/** Retries cover a lost compare-and-set, which needs a fresh read to resolve. */
const MAX_WRITE_ATTEMPTS = 3;

/**
 * Project the next `integrations` array. Removal runs first so replacing a
 * credential can drop the old entry and add the new one in the same array.
 */
function projectIntegrations(
	current: AgentIntegrationConfig[],
	delta: IntegrationDelta,
	removeDrafts = true,
): AgentIntegrationConfig[] {
	let next = delta.remove
		? current.filter((entry) => !matchesIntegrationRef(entry, delta.remove!))
		: [...current];

	const { add } = delta;
	if (!add) return next;

	// Drop a same-type draft entry (empty credentialId, written by the builder
	// before setup completes) so connecting a real credential replaces it
	// instead of leaving both the draft and the connected entry behind.
	if (removeDrafts) {
		next = next.filter((entry) => !(entry.type === add.type && isDraftIntegration(entry)));
	}

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
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly channelSetupService: AgentChannelSetupService,
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
		if (!add && !remove && !delta.request && !delta.cancelSetup) return { agent, changed: false };

		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			agent.projectId,
			context.user,
		);

		for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
			const result = await this.applyIntegrationAttempt(
				agent,
				{ ...delta, add, remove },
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

	private async applyIntegrationAttempt(
		agent: Agent,
		delta: IntegrationDelta,
		context: CredentialIntegrationMutationContext,
		credentialProvider: ReturnType<typeof createAgentCredentialProvider>,
	): Promise<IntegrationDeltaResult | undefined> {
		const state = await this.agentRepository.findById(agent.id);
		if (!state) throw new UserError(`Agent "${agent.id}" no longer exists`);
		// Setup validation must use the definition that belongs to this revision.
		Object.assign(agent, state);
		const skillRefs = await this.agentSkillRefs.refsForDraft(agent, {});
		const previous = captureAgentMutation(state, skillRefs);
		const { add, remove } = delta;

		const current = state.integrations ?? [];
		const removed = remove
			? current.find((entry) => matchesIntegrationRef(entry, remove))
			: undefined;
		const removesPending =
			remove &&
			state.pendingChannelSetup?.requested.some(({ integration }) =>
				matchesIntegrationRef(integration, remove),
			);

		const published = state.activeVersionId !== null;

		// A removal of something already gone is not a failure — and with
		// nothing to add there is no write left to make.
		if (!add && !removed && !removesPending && !delta.request && !delta.cancelSetup) {
			return { agent, changed: false, published };
		}

		const next = await this.projectDelta(state, delta);
		if (
			isEqual(current, next.integrations) &&
			isEqual(state.pendingChannelSetup ?? null, next.pendingChannelSetup)
		) {
			return { agent, changed: false, published };
		}
		const written = await this.persistIntegrations(
			agent,
			skillRefs,
			next,
			state,
			context,
			credentialProvider,
		);
		if (!written) return undefined;
		this.runtimeCacheService.clearRuntimes(agent.id);
		this.eventService.emit('agent-saved', { agentId: agent.id });
		await written.emitSetupCompleted?.();
		this.modificationTelemetry.record(
			buildAgentMutationEvent(agent, skillRefs, agent.projectId, context, previous, {}),
		);

		const removedIntegrations = current.filter(
			(entry) =>
				!next.integrations.some((integration) => matchesIntegrationRef(entry, integration)),
		);
		return {
			agent,
			changed: true,
			published,
			removedIntegrations,
			...(removed ? { removed } : {}),
		};
	}

	private async projectDelta(
		agent: Agent,
		delta: IntegrationDelta,
	): Promise<Required<AgentChannelState>> {
		if (delta.request) {
			const { integration, replaces } = delta.request;
			const requested = projectIntegrations(
				getDraftIntegrations(agent),
				{ add: integration, remove: replaces },
				false,
			);
			return await this.channelSetupService.prepare(agent, requested, {
				requested: integration,
				replaces,
			});
		}
		if (delta.cancelSetup) {
			return cancelChannelSetup(agent, delta.cancelSetup.setupId, delta.cancelSetup.type);
		}
		if (delta.add && delta.setupId) {
			return completeChannelSetup(agent, delta.setupId, delta.add, delta.remove);
		}
		return this.projectConfiguredDelta(agent, delta);
	}

	private projectConfiguredDelta(
		agent: Agent,
		delta: IntegrationDelta,
	): Required<AgentChannelState> {
		const integrations = projectIntegrations(agent.integrations ?? [], delta);
		if (!agent.pendingChannelSetup) return { integrations, pendingChannelSetup: null };
		const { add, remove } = delta;
		if (add) assertChannelSetupReference(agent, add);
		const requested = agent.pendingChannelSetup.requested.filter(
			(entry) => !remove || !matchesIntegrationRef(entry.integration, remove),
		);
		if (add) {
			const index = requested.findIndex((entry) => matchesIntegrationRef(entry.integration, add));
			if (index < 0) requested.push({ integration: add });
			else requested[index] = { integration: add };
		}
		return projectChannelSetup({ integrations }, requested);
	}

	private async persistIntegrations(
		agent: Agent,
		skillRefs: AgentSkillRefs,
		next: Required<AgentChannelState>,
		state: Pick<Agent, 'revision' | 'versionId' | 'activeVersionId'>,
		context: CredentialIntegrationMutationContext,
		credentialProvider: ReturnType<typeof createAgentCredentialProvider>,
	) {
		// Keep each channel change distinct from the published version.
		const versionId = uuid();

		// Gate evaluated against the state about to be written; the marker is
		// claimed and reported only once that write succeeded.
		Object.assign(agent, next);
		const emitSetupCompleted = await this.setupCompletionService.recordIfSetupComplete(
			agent,
			skillRefs,
			agent.projectId,
			credentialProvider,
			context.user,
		);

		const written = await this.agentRepository.updateIntegrations(
			agent.id,
			next.integrations,
			{
				revision: state.revision,
				versionId: state.versionId,
				activeVersionId: state.activeVersionId,
			},
			versionId,
			next.pendingChannelSetup,
		);
		if (!written) return undefined;

		agent.versionId = versionId;
		agent.revision = state.revision + 1;
		return { emitSetupCompleted };
	}
}
