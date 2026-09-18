import {
	stripHydratedFileData,
	type CheckpointStore,
	type SerializableAgentState,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';

import {
	decodeAgentSandboxHostMetadata,
	type AgentSandboxPrincipalHash,
} from '../agent-sandbox-principal';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import { AgentConversationLeaseService } from '../agent-conversation-lease.service';

/** File parts are checkpointed reference-only (a `Uint8Array` would not survive JSON round-tripping). */
function stripStateFileData(state: SerializableAgentState): SerializableAgentState {
	if (!state.messageList) return state;
	return {
		...state,
		messageList: {
			...state.messageList,
			messages: state.messageList.messages.map(stripHydratedFileData),
		},
	};
}

type CheckpointStatus =
	| {
			status: 'expired';
			checkpoint?: SerializableAgentState;
	  }
	| { status: 'not-found' }
	| {
			status: 'active';
			checkpoint: SerializableAgentState;
	  };

const MAX_SANDBOX_RECONCILIATION_CHECKPOINTS = 100;
export const CHECKPOINT_RECONCILIATION_OVERFLOW = Symbol('checkpoint-reconciliation-overflow');

@Service()
export class N8NCheckpointStorage {
	constructor(
		private readonly agentCheckpointRepository: AgentCheckpointRepository,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly leases: AgentConversationLeaseService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	getStorage(agentId: string, requireOwnership = true): CheckpointStore {
		return {
			save: async (key, state) => await this.save(key, state, agentId, requireOwnership),
			load: async (key) => await this.load(key, agentId),
			claimForResume: async (key: string, state: SerializableAgentState) =>
				await this.claimForResume(key, state, agentId, requireOwnership),
			delete: async (key) => await this.delete(key, agentId, requireOwnership),
		};
	}

	private async writeState<T>(
		state: SerializableAgentState,
		agentId: string,
		requireOwnership: boolean,
		write: (ctx: OperationContext) => Promise<T>,
	): Promise<T> {
		if (!requireOwnership) return await write({});
		if (!state.persistence?.threadId)
			throw new UnexpectedError('Agent checkpoint has no conversation');
		return await this.leases.write(
			this.leases.requireOwner(state.persistence.threadId, agentId),
			write,
		);
	}

	async getActiveRunIdsForSandbox(
		agentId: string,
		principalHash: AgentSandboxPrincipalHash,
	): Promise<Set<string> | typeof CHECKPOINT_RECONCILIATION_OVERFLOW> {
		const checkpoints = await this.agentCheckpointRepository.findForSandboxReconciliation(agentId);
		if (checkpoints.length > MAX_SANDBOX_RECONCILIATION_CHECKPOINTS) {
			return CHECKPOINT_RECONCILIATION_OVERFLOW;
		}

		const runIds = new Set<string>();

		for (const checkpoint of checkpoints) {
			if (checkpoint.expired || checkpoint.state === null) continue;

			try {
				const state = jsonParse<SerializableAgentState>(checkpoint.state);
				if (state.status !== 'running' && state.status !== 'suspended') continue;
				const scope = decodeAgentSandboxHostMetadata(state.persistence?.hostMetadata);
				if (scope?.principalHash === principalHash) runIds.add(checkpoint.runId);
			} catch {
				// A malformed checkpoint must not block workspace acquisition.
			}
		}

		return runIds;
	}

	async save(
		key: string,
		checkpointState: SerializableAgentState,
		agentId: string,
		requireOwnership = true,
	): Promise<void> {
		const state = stripStateFileData(checkpointState);
		await this.writeState(
			state,
			agentId,
			requireOwnership,
			async (ctx) =>
				await this.agentCheckpointRepository.saveState(key, agentId, JSON.stringify(state), ctx),
		);
	}

	async load(key: string, agentId: string): Promise<SerializableAgentState | undefined> {
		const checkpoint = await this.agentCheckpointRepository.findByRunIdAndAgentId(key, agentId);

		if (!checkpoint) return undefined;

		if (checkpoint.expired || checkpoint.state === null) {
			throw new UserError('This action has expired and cannot be resumed');
		}

		const state = jsonParse<SerializableAgentState>(checkpoint.state);
		if (state.status !== 'suspended') {
			throw new UserError('This action has already been handled');
		}

		return state;
	}

	async claimForResume(
		key: string,
		checkpointState: SerializableAgentState,
		agentId: string,
		requireOwnership = true,
	): Promise<boolean> {
		const state = stripStateFileData(checkpointState);
		return await this.writeState(
			state,
			agentId,
			requireOwnership,
			async (ctx) =>
				await this.agentCheckpointRepository.claimForResume(
					key,
					agentId,
					JSON.stringify(state),
					JSON.stringify({ ...state, status: 'running' }),
					ctx,
				),
		);
	}

	async cancelSuspended(
		key: string,
		state: SerializableAgentState,
		agentId: string,
	): Promise<boolean> {
		if (state.status !== 'suspended') return false;
		return await this.writeState(
			state,
			agentId,
			true,
			async (ctx) =>
				await this.agentCheckpointRepository.cancelSuspended(
					key,
					agentId,
					JSON.stringify(state),
					ctx,
				),
		);
	}

	/**
	 * The agent's open (unexpired, still parked) checkpoint for a thread, or
	 * null. The authoritative "is this conversation suspended right now?"
	 * lookup: unlike the `suspended` execution record, a checkpoint stops being
	 * suspended the moment the run is resumed or cancelled.
	 */
	async findSuspendedForThread(
		agentId: string,
		threadId: string,
	): Promise<SerializableAgentState | null> {
		const rows = await this.agentCheckpointRepository.findActiveForAgent(agentId);
		for (const row of rows) {
			const checkpoint = this.parseSuspendedState(row.state, threadId);
			if (checkpoint) return checkpoint;
		}
		return null;
	}

	private parseSuspendedState(
		state: string | null,
		threadId: string,
	): SerializableAgentState | null {
		if (!state) return null;
		let parsed: SerializableAgentState;
		try {
			parsed = jsonParse<SerializableAgentState>(state);
		} catch {
			return null;
		}
		if (parsed.status !== 'suspended' || parsed.persistence?.delegated === true) return null;
		if (parsed.persistence?.threadId !== threadId) return null;
		return parsed;
	}

	async getStatus(key: string, agentId: string): Promise<CheckpointStatus> {
		const checkpoint = await this.agentCheckpointRepository.findByRunIdAndAgentId(key, agentId);
		if (!checkpoint) return { status: 'not-found' };
		if (checkpoint.state === null) return { status: 'expired' };
		const state = jsonParse<SerializableAgentState>(checkpoint.state);
		if (checkpoint.expired) return { status: 'expired', checkpoint: state };
		return { status: 'active', checkpoint: state };
	}

	async delete(key: string, agentId: string, requireOwnership = true): Promise<void> {
		const checkpoint = await this.agentCheckpointRepository.findByRunIdAndAgentId(key, agentId);
		if (!checkpoint?.state) return;
		const state = jsonParse<SerializableAgentState>(checkpoint.state);
		await this.writeState(
			state,
			agentId,
			requireOwnership,
			async (ctx) =>
				await this.agentCheckpointRepository.expireByRunIdAndAgentId(key, agentId, ctx),
		);
	}

	async deleteSuspended(key: string, agentId: string): Promise<void> {
		const initial = await this.getStatus(key, agentId);
		const threadId =
			initial.status !== 'not-found' ? initial.checkpoint?.persistence?.threadId : undefined;
		if (!threadId) return;
		await this.leases.withLease(
			agentId,
			threadId,
			async () => {
				const current = await this.getStatus(key, agentId);
				if (current.status !== 'not-found' && current.checkpoint?.status === 'suspended') {
					await this.delete(key, agentId);
				}
			},
			{ waitTimeoutMs: 250 },
		);
	}

	/** Marks checkpoints past their TTL as expired. A failure propagates to the caller. */
	async pruneStaleSuspensions() {
		const ttlMs = this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds;
		const cutoffDate = new Date(Date.now() - ttlMs);

		const count = await this.agentCheckpointRepository.markExpired(cutoffDate);
		if (count > 0) {
			this.logger.info('Marked stale agent checkpoints as expired', { count });
		} else {
			this.logger.debug('No stale agent checkpoints to expire');
		}
	}
}
