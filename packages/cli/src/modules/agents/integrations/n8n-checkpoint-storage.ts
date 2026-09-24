import {
	stripHydratedFileData,
	type CheckpointStore,
	type SerializableAgentState,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse, OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import {
	decodeAgentSandboxHostMetadata,
	type AgentSandboxPrincipalHash,
} from '../agent-sandbox-principal';
import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import { checkpointExecutionId } from '../types/agent-queued-message';

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
		private readonly txRunner: TransactionRunner,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly queueRepository: AgentMessageQueueRepository,
	) {
		this.logger = this.logger.scoped('agents');
	}

	getStorage(agentId: string): CheckpointStore {
		return {
			save: async (key, state) => await this.save(key, state, agentId),
			load: async (key) => await this.load(key, agentId),
			claimForResume: async (key: string, state: SerializableAgentState) =>
				await this.claimForResume(key, state, agentId),
			delete: async (key, state) => {
				if (!state) return await this.delete(key, agentId);
				await this.withExecutionOwnership(state, async (ctx) => {
					await this.agentCheckpointRepository.expireByRunIdAndAgentId(key, agentId, ctx);
				});
			},
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

	async save(key: string, checkpointState: SerializableAgentState, agentId: string): Promise<void> {
		const state = stripStateFileData(checkpointState);
		await this.withExecutionOwnership(state, async (ctx) => {
			const existing = await this.agentCheckpointRepository.findByRunId(key, ctx);
			if (existing && existing.agentId !== agentId) {
				throw new UnexpectedError('Agent checkpoint is owned by a different agent');
			}
			const checkpoint = this.agentCheckpointRepository.create({
				...existing,
				runId: key,
				agentId,
				threadId: state.persistence?.threadId ?? null,
				state: JSON.stringify(state),
				expired: false,
			});
			await this.agentCheckpointRepository.saveCheckpoint(checkpoint, ctx);
			const executionId = checkpointExecutionId(state);
			const threadId = state.persistence?.threadId;
			if (state.status === 'suspended' && executionId && threadId) {
				// A continuation can start before the suspended predecessor finishes recording.
				await this.executionRepository.closeSteering(threadId, executionId, ctx);
				await this.queueRepository.releaseSteering(threadId, executionId, ctx);
			}
		});
	}

	private async withExecutionOwnership(
		state: SerializableAgentState,
		write: (ctx: OperationContext) => Promise<void>,
	): Promise<void> {
		const executionId = checkpointExecutionId(state);
		if (!executionId) return await write({});
		await this.txRunner.run({}, async (ctx) => {
			const threadId = state.persistence?.threadId;
			if (!threadId || !(await this.threadRepository.lockById(threadId, ctx))) {
				throw new OperationalError('Agent execution no longer owns this session');
			}
			const execution = await this.executionRepository.findExecution(executionId, ctx);
			const active = await this.queueRepository.findActive(threadId, ctx);
			if (
				execution?.status !== 'running' ||
				execution.threadId !== threadId ||
				(active && active.executionId !== executionId)
			) {
				throw new OperationalError('Agent execution no longer owns this session');
			}
			await write(ctx);
		});
	}

	private expiryCutoff(): Date {
		return new Date(
			Date.now() - this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds,
		);
	}

	async load(key: string, agentId: string): Promise<SerializableAgentState | undefined> {
		const checkpoint = await this.agentCheckpointRepository.findByRunIdAndAgentId(key, agentId);

		if (!checkpoint) return undefined;

		if (
			checkpoint.expired ||
			checkpoint.state === null ||
			checkpoint.updatedAt < this.expiryCutoff()
		) {
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
	): Promise<boolean> {
		const state = stripStateFileData(checkpointState);
		return await this.agentCheckpointRepository.claimForResume(
			key,
			agentId,
			JSON.stringify(state),
			JSON.stringify({ ...state, status: 'running' }),
			this.expiryCutoff(),
		);
	}

	async cancelSuspended(
		key: string,
		state: SerializableAgentState,
		agentId: string,
	): Promise<boolean> {
		if (state.status !== 'suspended') return false;
		const executionId = checkpointExecutionId(state);
		if (!executionId)
			return await this.agentCheckpointRepository.cancelSuspended(
				key,
				agentId,
				JSON.stringify(state),
			);
		return await this.txRunner.run({}, async (ctx) => {
			const threadId = state.persistence?.threadId;
			if (!threadId || !(await this.threadRepository.lockById(threadId, ctx))) return false;
			const running = await this.executionRepository.findRunningByThread(threadId, ctx);
			if (running.some(({ id }) => id !== executionId)) return false;
			return await this.agentCheckpointRepository.cancelSuspended(
				key,
				agentId,
				JSON.stringify(state),
				ctx,
			);
		});
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
		ctx: OperationContext = {},
	): Promise<SerializableAgentState | null> {
		const rows = await this.agentCheckpointRepository.findActiveForThread(
			agentId,
			threadId,
			this.expiryCutoff(),
			ctx,
		);
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

	async getStatus(
		key: string,
		agentId: string,
		ctx: OperationContext = {},
	): Promise<CheckpointStatus> {
		const checkpoint = await this.agentCheckpointRepository.findByRunIdAndAgentId(
			key,
			agentId,
			ctx,
		);
		if (!checkpoint) return { status: 'not-found' };
		if (checkpoint.state === null) return { status: 'expired' };
		const state = jsonParse<SerializableAgentState>(checkpoint.state);
		if (checkpoint.expired || checkpoint.updatedAt < this.expiryCutoff())
			return { status: 'expired', checkpoint: state };
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
