import type { InstanceRegistration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { randomUUID } from 'node:crypto';
import { InstanceSettings } from 'n8n-core';

import { N8N_VERSION } from '@/constants';

import { REGISTRY_CONSTANTS } from './instance-registry.types';
import type { InstanceStorage } from './storage/instance-storage.interface';

/**
 * Core service for instance lifecycle management in the Instance Registry.
 *
 * Handles backend selection (Redis vs memory), instance registration,
 * periodic heartbeat, and graceful shutdown/unregistration.
 */
@Service()
export class InstanceRegistryService {
	private storage!: InstanceStorage;

	private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

	private readonly instanceKey = randomUUID();

	private registeredAt = 0;

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-registry');
	}

	async init() {
		this.storage = await this.selectStorage();
		this.registeredAt = Date.now();

		const registration = this.buildRegistration();
		await this.storage.register(registration);
		this.startHeartbeat();

		this.logger.info('Instance registered', {
			instanceKey: this.instanceKey,
			backend: this.storage.kind,
			instanceType: this.instanceSettings.instanceType,
		});
	}

	async shutdown() {
		if (!this.storage) return;

		this.stopHeartbeat();

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

	async getAllInstances(): Promise<InstanceRegistration[]> {
		return await this.storage.getAllRegistrations();
	}

	getLocalInstance(): InstanceRegistration {
		return this.buildRegistration();
	}

	async getLastKnownState(): Promise<Map<string, InstanceRegistration>> {
		return await this.storage.getLastKnownState();
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
		return {
			schemaVersion: 1 as const,
			instanceKey: this.instanceKey,
			hostId: this.instanceSettings.hostId,
			instanceType: this.instanceSettings.instanceType,
			instanceRole: this.instanceSettings.instanceRole,
			version: N8N_VERSION,
			registeredAt: this.registeredAt,
			lastSeen: Date.now(),
		};
	}

	private async selectStorage(): Promise<InstanceStorage> {
		const useRedis = this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue';

		if (useRedis) {
			const { RedisInstanceStorage } = await import('./storage/redis-instance-storage');
			const { Container } = await import('@n8n/di');
			return Container.get(RedisInstanceStorage);
		}

		const { MemoryInstanceStorage } = await import('./storage/memory-storage');
		return new MemoryInstanceStorage();
	}

	private startHeartbeat() {
		this.heartbeatInterval = setInterval(async () => {
			try {
				await this.storage.heartbeat(this.buildRegistration());
				this.logger.debug('Heartbeat updated');
			} catch (error) {
				this.logger.warn('Heartbeat failed', { error });
			}
		}, REGISTRY_CONSTANTS.HEARTBEAT_INTERVAL_MS);
	}

	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}
}
