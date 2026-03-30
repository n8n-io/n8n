import type { InstanceRegistration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { RedisClientService } from '@/services/redis-client.service';

import type { InstanceStorage } from './instance-storage.interface';

/**
 * Redis-backed storage for instance registrations in distributed deployments.
 *
 * Stub: Full implementation is in PR #27527 (IAM-326/IAM-327).
 */
@Service()
export class RedisInstanceStorage implements InstanceStorage {
	readonly kind = 'redis' as const;

	constructor(
		_logger: Logger,
		_globalConfig: GlobalConfig,
		_redisClientService: RedisClientService,
	) {}

	async register(_registration: InstanceRegistration): Promise<void> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async heartbeat(_registration: InstanceRegistration): Promise<void> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async unregister(_instanceKey: string): Promise<void> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async getAllRegistrations(): Promise<InstanceRegistration[]> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async getRegistration(_instanceKey: string): Promise<InstanceRegistration | null> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async getLastKnownState(): Promise<Map<string, InstanceRegistration>> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async saveLastKnownState(_state: Map<string, InstanceRegistration>): Promise<void> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}

	async cleanupStaleMembers(): Promise<number> {
		throw new Error('RedisInstanceStorage not yet implemented');
	}
}
