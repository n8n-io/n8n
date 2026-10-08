import type { InstanceRegistration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig, ScalingModeConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { randomUUID } from 'node:crypto';

import { N8N_VERSION } from '@/constants';
import { resolveWorkerPoolName } from '@/scaling/queue-name';

import type { InstanceStorage } from './storage/instance-storage.interface';

/**
 * Core service for instance lifecycle management in the Instance Registry.
 *
 * Handles backend selection (Redis vs memory), instance registration,
 * the heartbeat write, and graceful shutdown/unregistration.
 */
@Service()
export class InstanceRegistryService {
	private storage!: InstanceStorage;

	private readonly instanceKey = randomUUID();

	private registeredAt = 0;

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly scalingModeConfig: ScalingModeConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-registry');
	}

	async init() {
		this.storage = await this.selectStorage();
		this.registeredAt = Date.now();

		const registration = this.buildRegistration();
		await this.storage.register(registration);

		this.logger.info('Instance registered', {
			instanceKey: this.instanceKey,
			backend: this.storage.kind,
			instanceType: this.instanceSettings.instanceType,
		});
	}

	async shutdown() {
		if (!this.storage) return;

		try {
			await this.storage.unregister(this.instanceKey);
		} catch (error) {
			this.logger.warn('Failed to unregister during shutdown', { error });
		}

		try {
			await this.storage.destroy();
		} catch (error) {
			this.logger.warn('Failed to destroy storage during shutdown', { error });
		}

		this.logger.debug('Instance unregistered');
	}

	async heartbeat(): Promise<void> {
		await this.storage.heartbeat(this.buildRegistration());
	}

	/** Returns an empty list when the storage read fails. */
	async getAllInstances(): Promise<InstanceRegistration[]> {
		try {
			return await this.storage.getAllRegistrations();
		} catch (error) {
			this.logger.warn('Failed to get all registrations', { error });
			return [];
		}
	}

	getLocalInstance(): InstanceRegistration {
		return this.buildRegistration();
	}

	/** Returns an empty map when the storage read fails. */
	async getLastKnownState(): Promise<Map<string, InstanceRegistration>> {
		try {
			return await this.storage.getLastKnownState();
		} catch (error) {
			this.logger.warn('Failed to get last known state', { error });
			return new Map();
		}
	}

	/** Reads the live registrations and the reconciliation baseline, and rejects when either read fails. */
	async readClusterState(): Promise<{
		instances: InstanceRegistration[];
		lastKnownState: Map<string, InstanceRegistration>;
	}> {
		const instances = await this.storage.getAllRegistrations();
		const lastKnownState = await this.storage.getLastKnownState();
		return { instances, lastKnownState };
	}

	async saveLastKnownState(state: Map<string, InstanceRegistration>): Promise<void> {
		await this.storage.saveLastKnownState(state);
	}

	async cleanupStaleMembers(): Promise<number> {
		return await this.storage.cleanupStaleMembers();
	}

	get storageBackend(): 'redis' | 'memory' {
		return this.storage.kind;
	}

	private buildRegistration(): InstanceRegistration {
		const base: InstanceRegistration = {
			schemaVersion: 1 as const,
			instanceKey: this.instanceKey,
			hostId: this.instanceSettings.hostId,
			instanceType: this.instanceSettings.instanceType,
			instanceRole: this.instanceSettings.instanceRole,
			version: N8N_VERSION,
			registeredAt: this.registeredAt,
			lastSeen: Date.now(),
		};

		if (this.instanceSettings.instanceType === 'worker') {
			return { ...base, poolName: resolveWorkerPoolName(this.scalingModeConfig.workerPool) };
		}

		return base;
	}

	private async selectStorage(): Promise<InstanceStorage> {
		const useRedis = this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue';

		if (useRedis) {
			const { RedisInstanceStorage } = await import('./storage/redis-instance-storage.js');
			const { Container } = await import('@n8n/di');
			return Container.get(RedisInstanceStorage);
		}

		const { MemoryInstanceStorage } = await import('./storage/memory-storage.js');
		return new MemoryInstanceStorage();
	}
}
