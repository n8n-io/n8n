import { instanceRegistrationSchema, type InstanceRegistration } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';
import { ensureError, jsonParse, jsonStringify } from 'n8n-workflow';

import { RedisClientService } from '@/services/redis-client.service';

import { REDIS_KEY_PATTERNS, REGISTRY_CONSTANTS } from '../instance-registry.types';
import type { InstanceStorage } from './instance-storage.interface';
import { CLEANUP_SCRIPT, READ_ALL_SCRIPT, REGISTER_SCRIPT, UNREGISTER_SCRIPT } from './lua-scripts';

@Service()
export class RedisInstanceStorage implements InstanceStorage {
	readonly kind = 'redis' as const;

	private readonly logger: Logger;

	private readonly redisPrefix: string;

	private readonly redisClient: Redis | Cluster;

	constructor(logger: Logger, globalConfig: GlobalConfig, redisClientService: RedisClientService) {
		this.logger = logger.scoped(['instance-registry', 'redis']);
		this.redisPrefix = globalConfig.redis.prefix;
		this.redisClient = redisClientService.createClient({
			type: 'registry(n8n)',
			extraOptions: { commandTimeout: REGISTRY_CONSTANTS.OPERATION_TIMEOUT_MS },
		});
	}

	async register(registration: InstanceRegistration): Promise<void> {
		await this.upsertRegistration(registration, 'register');
	}

	async heartbeat(registration: InstanceRegistration): Promise<void> {
		await this.upsertRegistration(registration, 'heartbeat');
	}

	async unregister(instanceKey: string): Promise<void> {
		try {
			await this.redisClient.eval(
				UNREGISTER_SCRIPT,
				2,
				this.instanceKey(instanceKey),
				this.membershipSetKey(),
			);
		} catch (error) {
			this.logger.warn('Failed to unregister instance', {
				instanceKey,
				error: ensureError(error).message,
			});
		}
	}

	async getAllRegistrations(): Promise<InstanceRegistration[]> {
		try {
			const raw: unknown = await this.redisClient.eval(READ_ALL_SCRIPT, 1, this.membershipSetKey());

			if (!Array.isArray(raw)) return [];

			const results = raw.filter((item): item is string => typeof item === 'string');

			return results
				.map((json) => {
					try {
						const parsed = instanceRegistrationSchema.safeParse(jsonParse(json));
						if (!parsed.success) {
							this.logger.warn('Skipping invalid registration entry', {
								error: parsed.error.message,
							});
							return null;
						}
						return parsed.data;
					} catch (error) {
						this.logger.warn('Skipping malformed registration entry', {
							error: ensureError(error).message,
						});
						return null;
					}
				})
				.filter((r): r is InstanceRegistration => r !== null);
		} catch (error) {
			this.logger.warn('Failed to get all registrations', {
				error: ensureError(error).message,
			});
			return [];
		}
	}

	async getRegistration(instanceKey: string): Promise<InstanceRegistration | null> {
		try {
			const json = await this.redisClient.get(this.instanceKey(instanceKey));
			if (json === null) return null;

			const parsed = instanceRegistrationSchema.safeParse(jsonParse(json));
			if (!parsed.success) {
				this.logger.warn('Invalid registration data', {
					instanceKey,
					error: parsed.error.message,
				});
				return null;
			}
			return parsed.data;
		} catch (error) {
			this.logger.warn('Failed to get registration', {
				instanceKey,
				error: ensureError(error).message,
			});
			return null;
		}
	}

	async getLastKnownState(): Promise<Map<string, InstanceRegistration>> {
		try {
			const json = await this.redisClient.get(this.stateKey());
			if (json === null) return new Map();

			const record = jsonParse<Record<string, unknown>>(json);
			const state = new Map<string, InstanceRegistration>();

			for (const [key, value] of Object.entries(record)) {
				const parsed = instanceRegistrationSchema.safeParse(value);
				if (parsed.success) {
					state.set(key, parsed.data);
				} else {
					this.logger.warn('Skipping invalid state entry', {
						instanceKey: key,
						error: parsed.error.message,
					});
				}
			}

			return state;
		} catch (error) {
			this.logger.warn('Failed to get last known state', {
				error: ensureError(error).message,
			});
			return new Map();
		}
	}

	async saveLastKnownState(state: Map<string, InstanceRegistration>): Promise<void> {
		try {
			const record = Object.fromEntries(state);
			await this.redisClient.set(
				this.stateKey(),
				jsonStringify(record),
				'EX',
				REGISTRY_CONSTANTS.STATE_TTL_SECONDS,
			);
		} catch (error) {
			this.logger.warn('Failed to save last known state', {
				error: ensureError(error).message,
			});
		}
	}

	async cleanupStaleMembers(): Promise<number> {
		try {
			const removed: unknown = await this.redisClient.eval(
				CLEANUP_SCRIPT,
				1,
				this.membershipSetKey(),
			);

			return typeof removed === 'number' ? removed : 0;
		} catch (error) {
			this.logger.warn('Failed to cleanup stale members', {
				error: ensureError(error).message,
			});
			return 0;
		}
	}

	async destroy(): Promise<void> {
		this.redisClient.disconnect();
	}

	private async upsertRegistration(
		registration: InstanceRegistration,
		operation: string,
	): Promise<void> {
		try {
			await this.redisClient.eval(
				REGISTER_SCRIPT,
				2,
				this.instanceKey(registration.instanceKey),
				this.membershipSetKey(),
				jsonStringify(registration),
				String(REGISTRY_CONSTANTS.REGISTRATION_TTL_SECONDS),
			);
		} catch (error) {
			this.logger.warn(`Failed to ${operation} instance`, {
				instanceKey: registration.instanceKey,
				error: ensureError(error).message,
			});
		}
	}

	private instanceKey(key: string): string {
		return REDIS_KEY_PATTERNS.instanceKey(this.redisPrefix, key);
	}

	private membershipSetKey(): string {
		return REDIS_KEY_PATTERNS.membershipSet(this.redisPrefix);
	}

	private stateKey(): string {
		return REDIS_KEY_PATTERNS.stateKey(this.redisPrefix);
	}
}
