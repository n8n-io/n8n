import type { InstanceRegistration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig, GlobalConfig, ScalingModeConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { Redis } from 'ioredis';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { RedisClientService } from '@/services/redis-client.service';

import { InstanceRegistryService } from '../instance-registry.service';
import { REDIS_KEY_PATTERNS } from '../instance-registry.types';
import { StaleMemberCleanupTask } from '../stale-member-cleanup.task';
import { RedisInstanceStorage } from '../storage/redis-instance-storage';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const PREFIX = `stale-member-cleanup-${process.pid}`;
const MAINS = 4;
const RUNS_PER_MAIN = 10;

type Main = {
	storage: RedisInstanceStorage;
	service: InstanceRegistryService;
	task: StaleMemberCleanupTask;
	logger: Logger;
};

const membersKey = REDIS_KEY_PATTERNS.membershipSet(PREFIX);
const dataKey = (instanceKey: string): string =>
	REDIS_KEY_PATTERNS.instanceKey(PREFIX, instanceKey);
const keys = (stem: string, count: number): string[] =>
	Array.from({ length: count }, (_, i) => `${stem}-${i}`);
const sorted = (values: string[]): string[] => [...values].sort();

function registration(instanceKey: string): InstanceRegistration {
	return {
		schemaVersion: 1,
		instanceKey,
		hostId: `host-${instanceKey}`,
		instanceType: 'main',
		instanceRole: 'follower',
		version: '1.0.0',
		registeredAt: Date.now(),
		lastSeen: Date.now(),
	};
}

describe.skipIf(!REDIS_HOST || !REDIS_PORT)(
	'StaleMemberCleanupTask across mains (real Redis)',
	() => {
		let control: Redis;
		let mains: Main[];

		async function createMain(index: number): Promise<Main> {
			const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
			const redisClientService = mock<RedisClientService>();
			redisClientService.createClient.mockImplementation(
				({ extraOptions }) => new Redis({ host: REDIS_HOST, port: REDIS_PORT, ...extraOptions }),
			);
			const storage = new RedisInstanceStorage(
				logger,
				mock<GlobalConfig>({ redis: { prefix: PREFIX } }),
				redisClientService,
			);
			Container.set(RedisInstanceStorage, storage);
			const service = new InstanceRegistryService(
				mock<InstanceSettings>({
					isMultiMain: true,
					hostId: `main-${index}`,
					instanceType: 'main',
					instanceRole: index === 0 ? 'leader' : 'follower',
				}),
				mock<ExecutionsConfig>({ mode: 'queue' }),
				mock<ScalingModeConfig>(),
				logger,
			);
			await service.init();
			return { storage, service, task: new StaleMemberCleanupTask(logger, service), logger };
		}

		const onMain = (i: number): Main => mains[i % MAINS];

		const mainInstanceKeys = (): string[] =>
			mains.map((main) => main.service.getLocalInstance().instanceKey);

		async function registerAll(instanceKeys: string[]): Promise<void> {
			await Promise.all(
				instanceKeys.map(async (k, i) => await onMain(i).storage.register(registration(k))),
			);
		}

		async function heartbeatRounds(instanceKeys: string[], rounds: number): Promise<void> {
			for (let round = 0; round < rounds; round++) {
				await Promise.all(
					instanceKeys.map(
						async (k, i) => await onMain(i + round).storage.heartbeat(registration(k)),
					),
				);
			}
		}

		async function runTaskOnEveryMainConcurrently(): Promise<void> {
			await Promise.all(
				mains.flatMap((main) =>
					Array.from({ length: RUNS_PER_MAIN }, async () => await main.task.run()),
				),
			);
		}

		function removedByTaskRuns(): number {
			return mains
				.flatMap((main) => vi.mocked(main.logger.info).mock.calls)
				.filter(([message]) => message === 'Cleaned up stale registry members')
				.reduce((total, [, meta]) => total + (meta as { removed: number }).removed, 0);
		}

		async function membersOfSet(): Promise<string[]> {
			return sorted(await control.smembers(membersKey));
		}

		async function instancesSeenBy(main: Main): Promise<string[]> {
			return sorted((await main.service.getAllInstances()).map((r) => r.instanceKey));
		}

		beforeAll(() => {
			control = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
		});

		beforeEach(async () => {
			mains = [];
			for (let i = 0; i < MAINS; i++) mains.push(await createMain(i));
		});

		afterEach(async () => {
			await Promise.all(mains.map(async (main) => await main.service.shutdown()));
			const leftover = await control.keys(`${PREFIX}:*`);
			if (leftover.length > 0) await control.del(...leftover);
		});

		afterAll(async () => {
			await control.quit();
		});

		it('removes each stale member exactly once when every main runs the task at the same time', async () => {
			const live = keys('live', 50);
			const stale = keys('stale', 500);
			await registerAll([...live, ...stale]);
			await control.del(...stale.map(dataKey));
			expect(await control.scard(membersKey)).toBe(live.length + stale.length + MAINS);

			await Promise.all([runTaskOnEveryMainConcurrently(), heartbeatRounds(live, 20)]);

			const expectedInstances = sorted([...live, ...mainInstanceKeys()]);
			expect(removedByTaskRuns()).toBe(stale.length);
			expect(await membersOfSet()).toEqual(sorted(expectedInstances.map(dataKey)));
			expect(await control.exists(...expectedInstances.map(dataKey))).toBe(
				expectedInstances.length,
			);
			for (const main of mains) {
				expect(await instancesSeenBy(main)).toEqual(expectedInstances);
			}
		});

		it('never removes a live member while mains register, heartbeat and unregister concurrently', async () => {
			const live = keys('live', 100);
			const churn = keys('churn', 30);
			await registerAll(live);
			const expectedInstances = sorted([...live, ...mainInstanceKeys()]);

			let fewestSeen = Number.POSITIVE_INFINITY;
			const readWhileRunning = async (): Promise<void> => {
				for (let i = 0; i < 30; i++) {
					const seen = await instancesSeenBy(onMain(i));
					fewestSeen = Math.min(fewestSeen, seen.length);
				}
			};
			const churnWhileRunning = async (): Promise<void> => {
				for (let round = 0; round < 10; round++) {
					await registerAll(churn);
					await Promise.all(churn.map(async (k, i) => await onMain(i).storage.unregister(k)));
				}
			};

			await Promise.all([
				runTaskOnEveryMainConcurrently(),
				heartbeatRounds(live, 20),
				churnWhileRunning(),
				readWhileRunning(),
			]);

			expect(removedByTaskRuns()).toBe(0);
			expect(fewestSeen).toBeGreaterThanOrEqual(expectedInstances.length);
			expect(await membersOfSet()).toEqual(sorted(expectedInstances.map(dataKey)));
			for (const main of mains) {
				expect(await instancesSeenBy(main)).toEqual(expectedInstances);
			}
		});
	},
);
