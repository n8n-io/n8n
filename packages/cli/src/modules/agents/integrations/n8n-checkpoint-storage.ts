import type { CheckpointStore, SerializableAgentState } from '@n8n/agents';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UserError } from 'n8n-workflow';
import { strict } from 'node:assert';

import { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

type CheckpointStatus =
	| {
			status: 'expired';
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
			load: async (key) => await this.load(key),
			delete: async (key) => await this.delete(key),
		};
	}

	init() {
		strict(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');

		if (this.instanceSettings.isLeader) this.startPruning();
	}

	async save(
		key: string,
		state: SerializableAgentState,
		agentId: string | null = null,
	): Promise<void> {
		const existing = await this.agentCheckpointRepository.findOneBy({ runId: key });

		if (existing) {
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

	async load(key: string): Promise<SerializableAgentState | undefined> {
		const checkpoint = await this.agentCheckpointRepository.findOneBy({ runId: key });

		if (!checkpoint) return undefined;

		if (checkpoint.expired || checkpoint.state === null) {
			throw new UserError('This action has expired and cannot be resumed');
		}

		return jsonParse<SerializableAgentState>(checkpoint.state);
	}

	async getStatus(key: string): Promise<CheckpointStatus> {
		const checkpoint = await this.agentCheckpointRepository.findOneBy({ runId: key });
		if (!checkpoint) return { status: 'not-found' };
		if (checkpoint.expired || checkpoint.state === null) return { status: 'expired' };
		return { status: 'active', checkpoint: jsonParse<SerializableAgentState>(checkpoint.state) };
	}

	async delete(key: string): Promise<void> {
		await this.agentCheckpointRepository.update({ runId: key }, { expired: true, state: null });
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
