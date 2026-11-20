import type { GlobalConfig } from '@n8n/config';
import type { Redis as SingleNodeClient } from 'ioredis';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { RedisClientService } from '@n8n/backend-services';

import { LeaderElectionClient } from '../leader-election-client';

const PREFIX = 'n8n';
const LEADER_KEY = `${PREFIX}:main_instance_leader`;
const HOST_ID = 'main-n8n-main-0';

describe('LeaderElectionClient', () => {
	const redisClient = mock<SingleNodeClient>();
	const instanceSettings = mock<InstanceSettings>({ hostId: HOST_ID });
	const globalConfig = mock<GlobalConfig>({
		redis: { prefix: PREFIX },
		multiMainSetup: { ttl: 10 },
	});
	const redisClientService = mock<RedisClientService>();
	redisClientService.toValidPrefix.mockImplementation((prefix) => prefix);
	redisClientService.createClient.mockReturnValue(redisClient);

	let client: LeaderElectionClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new LeaderElectionClient(instanceSettings, globalConfig, redisClientService);
	});

	describe('clearLeader', () => {
		it('should only delete the leader key if it holds this host ID', async () => {
			redisClient.eval.mockResolvedValue(1);

			await client.clearLeader();

			expect(redisClient.del).not.toHaveBeenCalled();
			expect(redisClient.eval).toHaveBeenCalledWith(
				expect.stringContaining('redis.call("GET", KEYS[1]) == ARGV[1]'),
				1,
				LEADER_KEY,
				HOST_ID,
			);
		});

		it('should return `true` when the key was deleted', async () => {
			redisClient.eval.mockResolvedValue(1);

			const result = await client.clearLeader();

			expect(result).toEqual({ ok: true, result: true });
		});

		it('should return `false` when the key is missing or held by another host', async () => {
			redisClient.eval.mockResolvedValue(0);

			const result = await client.clearLeader();

			expect(result).toEqual({ ok: true, result: false });
		});

		it('should return an error when the Redis command fails', async () => {
			const error = new Error('Command timed out');
			redisClient.eval.mockRejectedValue(error);

			const result = await client.clearLeader();

			expect(result).toEqual({ ok: false, error });
		});
	});
});
