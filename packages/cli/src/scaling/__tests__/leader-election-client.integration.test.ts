import type { GlobalConfig } from '@n8n/config';
import { Redis } from 'ioredis';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { RedisClientService } from '@n8n/backend-services';

import { LeaderElectionClient } from '../leader-election-client';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

let caseCounter = 0;

describe.skipIf(!REDIS_HOST || !REDIS_PORT)('leader election (real Redis)', () => {
	let control: Redis;
	let prefix: string;
	let clients: LeaderElectionClient[];

	const leaderKey = () => `${prefix}:main_instance_leader`;

	const createClient = (hostId: string) => {
		const redisClientService = mock<RedisClientService>();
		redisClientService.toValidPrefix.mockImplementation((p) => p);
		redisClientService.createClient.mockImplementation(
			() => new Redis({ host: REDIS_HOST, port: REDIS_PORT }),
		);
		const client = new LeaderElectionClient(
			mock<InstanceSettings>({ hostId }),
			mock<GlobalConfig>({ redis: { prefix }, multiMainSetup: { ttl: 10 } }),
			redisClientService,
		);
		clients.push(client);
		return client;
	};

	beforeAll(() => {
		control = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
	});

	beforeEach(() => {
		prefix = `leader-election-${process.pid}-${caseCounter++}`;
		clients = [];
	});

	afterEach(async () => {
		for (const client of clients) client.destroy();
		await control.del(leaderKey());
	});

	afterAll(async () => {
		await control.quit();
	});

	it('should delete the leader key when this host still holds it', async () => {
		const hostA = createClient('main-a');
		expect(await hostA.setLeaderIfNotExists()).toEqual({ ok: true, result: true });

		expect(await hostA.clearLeader()).toEqual({ ok: true, result: true });

		expect(await control.get(leaderKey())).toBeNull();
	});

	it("should not delete the new leader's key when a deposed leader shuts down", async () => {
		const hostA = createClient('main-a');
		const hostB = createClient('main-b');
		const hostC = createClient('main-c');

		// A becomes leader, then its lease expires without A noticing
		// (e.g. Redis was unreachable for longer than the TTL)
		expect(await hostA.setLeaderIfNotExists()).toEqual({ ok: true, result: true });
		await control.del(leaderKey());

		// B claims the vacant leadership
		expect(await hostB.setLeaderIfNotExists()).toEqual({ ok: true, result: true });

		// A still believes it is leader and clears the key on shutdown
		expect(await hostA.clearLeader()).toEqual({ ok: true, result: false });

		// B's key survives, so C cannot claim leadership alongside B
		expect(await control.get(leaderKey())).toBe('main-b');
		expect(await hostC.setLeaderIfNotExists()).toEqual({ ok: true, result: false });
		expect(await hostB.tryRenewLeaderTtl()).toEqual({ ok: true, result: { id: 'success' } });
	});
});
