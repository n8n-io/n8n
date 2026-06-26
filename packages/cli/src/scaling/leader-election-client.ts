import { RedisClientService } from '@/services/redis-client.service';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Cluster, Redis } from 'ioredis';
import { InstanceSettings } from 'n8n-core';
import { ensureError, type Result, createResultOk, createResultError } from 'n8n-workflow';

const COMMAND_TIMEOUT_MS = 5_000;

/**
 * Atomically extends the leader key TTL only if the current value matches the
 * provided hostId
 *
 * KEYS[1] - leader key
 * ARGV[1] - hostId
 * ARGV[2] - TTL in seconds
 *
 * Returns:
 * -1                  key does not exist
 * "actual-value"      key exists but value is not the expected value
 * 1                   value matched and TTL was extended
 * 0                   value matched, but TTL was not extended
 */
const INCREASE_TTL_IF_LEADER = `
-- Renew only if we still hold the lock
local currentValue = redis.call("GET", KEYS[1])

if not currentValue then
  return -1
end

if currentValue ~= ARGV[1] then
  return currentValue
end

return redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]))
`;

export type TtlRenewalResultKeyMissing = { id: 'key-missing' };
export type TtlRenewalResultOtherHostIsLeader = {
	id: 'other-host-is-leader';
	currentLeaderId: string;
};
export type TtlRenewalResultSuccess = { id: 'success' };

export type TtlRenewalResult =
	| TtlRenewalResultKeyMissing
	| TtlRenewalResultOtherHostIsLeader
	| TtlRenewalResultSuccess;

/**
 * Redis-backed client for leader election in multi-main setups. Uses a TTL-based key to
 * track which instance is the current leader.
 */
@Service()
export class LeaderElectionClient {
	private readonly redisClient: Redis | Cluster;

	private readonly leaderKey: string;

	private readonly leaderKeyTtlInS: number;

	private get hostId() {
		return this.instanceSettings.hostId;
	}

	constructor(
		private readonly instanceSettings: InstanceSettings,
		globalConfig: GlobalConfig,
		redisClientService: RedisClientService,
	) {
		const prefix = redisClientService.toValidPrefix(globalConfig.redis.prefix);
		this.leaderKey = prefix + ':main_instance_leader';

		this.leaderKeyTtlInS = globalConfig.multiMainSetup.ttl;

		this.redisClient = redisClientService.createClient({
			type: 'leader(n8n)',
			extraOptions: { commandTimeout: COMMAND_TIMEOUT_MS },
		});
	}

	/** Return the current leader's hostId, or `null` if the key is absent. */
	async getLeader(): Promise<Result<string | null, Error>> {
		try {
			return createResultOk(await this.redisClient.get(this.leaderKey));
		} catch (e) {
			return createResultError(ensureError(e));
		}
	}

	/** Claim leadership with a TTL. Returns `true` if the key was set (i.e. no leader yet). */
	async setLeaderIfNotExists(): Promise<Result<boolean, Error>> {
		try {
			const result = await this.redisClient.set(
				this.leaderKey,
				this.hostId,
				'EX',
				this.leaderKeyTtlInS,
				'NX',
			);
			return createResultOk(result === 'OK');
		} catch (e) {
			return createResultError(ensureError(e));
		}
	}

	/** Atomically extend the leader key TTL only if this host still holds it. */
	async tryRenewLeaderTtl(): Promise<Result<TtlRenewalResult, Error>> {
		try {
			const result = await this.redisClient.eval(
				INCREASE_TTL_IF_LEADER,
				1,
				this.leaderKey,
				this.hostId,
				this.leaderKeyTtlInS,
			);

			if (result === -1 || result === 0) {
				return createResultOk({ id: 'key-missing' });
			}
			if (result === 1) {
				return createResultOk({ id: 'success' });
			}
			if (typeof result === 'string') {
				return createResultOk({ id: 'other-host-is-leader', currentLeaderId: result });
			}

			return createResultError(
				new Error(`Unexpected result from Redis script: ${JSON.stringify(result)}`),
			);
		} catch (e) {
			return createResultError(ensureError(e));
		}
	}

	/** Delete the leader key so another instance can claim leadership. */
	async clearLeader(): Promise<Result<void, Error>> {
		try {
			await this.redisClient.del(this.leaderKey);
			return createResultOk(undefined);
		} catch (e) {
			return createResultError(ensureError(e));
		}
	}

	/** Disconnect the underlying Redis client. */
	destroy() {
		this.redisClient.disconnect();
	}
}
