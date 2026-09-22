import {
	stripHydratedFileData,
	type CheckpointStore,
	type SerializableAgentState,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';

import {
	decodeAgentSandboxHostMetadata,
	type AgentSandboxPrincipalHash,
} from '../agent-sandbox-principal';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import { AgentSessionLock } from '../agent-session-lock.service';

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
		private readonly sessionLock: AgentSessionLock,
	) {
		this.logger = this.logger.scoped('agents');
	}

	getStorage(agentId: string, projectId?: string): CheckpointStore {
		return {
			save: async (key, state) => await this.save(key, state, agentId, projectId),
			load: async (key) => await this.load(key, agentId, projectId),
			claimForResume: async (key: string, state: SerializableAgentState) =>
				await this.claimForResume(key, state, agentId),
			delete: async (key) => await this.delete(key, agentId),
		};
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
		projectId?: string,
	): Promise<void> {
		const state = stripStateFileData(checkpointState);
		const threadId = state.persistence?.threadId;
		const input = {
			runId: key,
			agentId,
			threadId: threadId ?? null,
			state: JSON.stringify(state),
		};
		if (!projectId || !threadId) {
			await this.agentCheckpointRepository.saveCheckpoint(input);
			return;
		}
		const executionId = state.persistence?.hostRunId;
		if (!executionId) throw new UnexpectedError('Agent checkpoint has no execution ID');
		await this.sessionLock.run(
			projectId,
			async (ctx) =>
				await this.agentCheckpointRepository.saveForRunningExecution(
					{ ...input, projectId, executionId },
					ctx,
				),
		);
	}

	async load(
		key: string,
		agentId: string,
		projectId?: string,
	): Promise<SerializableAgentState | undefined> {
		const checkpoint = await this.agentCheckpointRepository.findByRunIdAndAgentId(key, agentId);

		if (!checkpoint) return undefined;

		if (checkpoint.expired || checkpoint.state === null) {
			throw new UserError('This action has expired and cannot be resumed');
		}

		const state = jsonParse<SerializableAgentState>(checkpoint.state);
		const threadId = state.persistence?.threadId;
		if (
			projectId &&
			threadId &&
			!(await this.agentCheckpointRepository.sessionExists(projectId, agentId, threadId))
		) {
			throw new UserError('This action has expired and cannot be resumed');
		}
		if (state.status !== 'suspended') {
			throw new UserError('This action has already been handled');
		}

		return state;
	}

	async claimForResume(
		key: string,
		checkpointState: SerializableAgentState,
		agentId: string,
	): Promise<boolean> {
		const state = stripStateFileData(checkpointState);
		return await this.agentCheckpointRepository.claimForResume(
			key,
			agentId,
			JSON.stringify(state),
			JSON.stringify({ ...state, status: 'running' }),
		);
	}

	async cancelSuspended(
		key: string,
		state: SerializableAgentState,
		agentId: string,
	): Promise<boolean> {
		if (state.status !== 'suspended') return false;
		return await this.agentCheckpointRepository.cancelSuspended(
			key,
			agentId,
			JSON.stringify(state),
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
		const rows = await this.agentCheckpointRepository.findActiveForThread(agentId, threadId);
		for (const row of rows) {
			const checkpoint = this.parseSuspendedState(row.state, threadId);
			if (checkpoint) return checkpoint;
		}
		return null;
	}

	async hasNoConflictingThreadResource(
		agentId: string,
		threadId: string,
		resourceId: string,
	): Promise<boolean> {
		const rows = await this.agentCheckpointRepository.findRetainedByThreadId(threadId);
		for (const row of rows) {
			if (!row.state) continue;
			const state = jsonParse<SerializableAgentState | null>(row.state, { fallbackValue: null });
			if (
				state?.persistence?.threadId === threadId &&
				(row.agentId !== agentId || state.persistence.resourceId !== resourceId)
			) {
				return false;
			}
		}
		return true;
	}

	private parseSuspendedState(
		state: string | null,
		threadId: string,
	): SerializableAgentState | null {
		if (!state) return null;
		let parsed: SerializableAgentState | null;
		try {
			parsed = jsonParse<SerializableAgentState | null>(state);
		} catch {
			return null;
		}
		if (parsed?.status !== 'suspended' || parsed.persistence?.delegated === true) return null;
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

	async delete(key: string, agentId: string): Promise<void> {
		await this.agentCheckpointRepository.expireByRunIdAndAgentId(key, agentId);
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
