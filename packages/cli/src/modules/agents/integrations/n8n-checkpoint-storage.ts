import {
	stripHydratedFileData,
	type CheckpointStore,
	type SerializableAgentState,
} from '@n8n/agents';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError, UserError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

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

@Service()
export class N8NCheckpointStorage {
	private pruneTimeout: NodeJS.Timeout | undefined;

	private isStopping = false;

	private isInitialized = false;

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly agentCheckpointRepository: AgentCheckpointRepository,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {
		this.logger = this.logger.scoped('agents');
		this.isInitialized = this.moduleRegistry.isActive('agents');
	}

	getStorage(agentId: string): CheckpointStore {
		return {
			save: async (key, state) => await this.save(key, state, agentId),
			load: async (key) => await this.load(key, agentId),
			claimForResume: async (key: string, state: SerializableAgentState) =>
				await this.claimForResume(key, state, agentId),
			delete: async (key) => await this.delete(key, agentId),
		};
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.instanceSettings.isLeader) this.startPruning();
	}

	async save(key: string, checkpointState: SerializableAgentState, agentId: string): Promise<void> {
		const state = stripStateFileData(checkpointState);
		const existing = await this.agentCheckpointRepository.findByRunId(key);

		if (existing) {
			if (existing.agentId !== agentId) {
				throw new UnexpectedError('Agent checkpoint is owned by a different agent');
			}
			existing.state = JSON.stringify(state);
			existing.expired = false;
			await this.agentCheckpointRepository.save(existing);
		} else {
			const checkpoint = this.agentCheckpointRepository.create({
				runId: key,
				agentId,
				state: JSON.stringify(state),
				expired: false,
			});
			await this.agentCheckpointRepository.save(checkpoint);
		}
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

	@OnLeaderTakeover()
	startPruning() {
		this.isStopping = false;
		this.scheduleNextPrune(0);
	}

	@OnLeaderStepdown()
	stopPruning() {
		clearTimeout(this.pruneTimeout);
		this.pruneTimeout = undefined;
	}

	@OnShutdown()
	shutdown() {
		this.isStopping = true;
		this.stopPruning();
	}

	private scheduleNextPrune(delayMs = Time.hours.toMilliseconds) {
		if (this.isStopping || !this.isInitialized) return;
		this.pruneTimeout = setTimeout(async () => {
			await this.pruneStaleSuspensions();
		}, delayMs);
	}

	private async pruneStaleSuspensions() {
		const ttlMs = this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds;
		const cutoffDate = new Date(Date.now() - ttlMs);

		try {
			const count = await this.agentCheckpointRepository.markExpired(cutoffDate);
			if (count > 0) {
				this.logger.info('Marked stale agent checkpoints as expired', { count });
			} else {
				this.logger.debug('No stale agent checkpoints to expire');
			}
			this.scheduleNextPrune();
		} catch (error: unknown) {
			this.logger.warn('Failed to expire stale agent checkpoints', { error });
			this.scheduleNextPrune(Time.seconds.toMilliseconds * 30);
		}
	}
}
