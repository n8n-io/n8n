import type { InstanceRegistration } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { RedisClientService } from '@n8n/backend-services';
import type { ExecutionsConfig, GlobalConfig, ScalingModeConfig } from '@n8n/config';
import { ClusterCheckMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Redis } from 'ioredis';
import type { InstanceSettings } from 'n8n-core';
import { once } from 'node:events';
import { mock } from 'vitest-mock-extended';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { Push } from '@/push';

import '../checks/index';
import { CheckService } from '../checks/check.service';
import { InstanceRegistryReconciliationTask } from '../checks/instance-registry-reconciliation.task';
import { InstanceRegistryService } from '../instance-registry.service';
import { REDIS_KEY_PATTERNS } from '../instance-registry.types';
import { RedisInstanceStorage } from '../storage/redis-instance-storage';

const REDIS_HOST = process.env.N8N_TEST_REDIS_HOST;
const REDIS_PORT = Number(process.env.N8N_TEST_REDIS_PORT);

const PREFIX = `instance-registry-reconciliation-${process.pid}`;
const MAINS = 4;
const ROUNDS = 20;

const AUDIT_JOINED = 'n8n.audit.cluster.instance-joined';
const AUDIT_LEFT = 'n8n.audit.cluster.instance-left';
const AUDIT_SPLIT_BRAIN_DETECTED = 'n8n.audit.cluster.split-brain.detected';

type Main = {
	client: Redis;
	storage: RedisInstanceStorage;
	service: InstanceRegistryService;
	task: InstanceRegistryReconciliationTask;
	eventBus: MessageEventBus;
};

const stateKey = REDIS_KEY_PATTERNS.stateKey(PREFIX);
const keys = (stem: string, count: number): string[] =>
	Array.from({ length: count }, (_, i) => `${stem}-${i}`);
const sorted = (values: string[]): string[] => [...values].sort();
const everyNth = (values: string[], round: number): string[] =>
	values.filter((_, i) => i % ROUNDS === round);

function registration(instanceKey: string, role: 'leader' | 'follower'): InstanceRegistration {
	return {
		schemaVersion: 1,
		instanceKey,
		hostId: `host-${instanceKey}`,
		instanceType: 'main',
		instanceRole: role,
		version: '1.0.0',
		registeredAt: Date.now(),
		lastSeen: Date.now(),
	};
}

describe.skipIf(!REDIS_HOST || !REDIS_PORT)(
	'InstanceRegistryReconciliationTask across mains (real Redis)',
	() => {
		let control: Redis;
		let mains: Main[];

		async function createMain(index: number): Promise<Main> {
			const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
			let client!: Redis;
			const redisClientService = mock<RedisClientService>();
			redisClientService.createClient.mockImplementation(({ extraOptions }) => {
				client = new Redis({ host: REDIS_HOST, port: REDIS_PORT, ...extraOptions });
				return client;
			});
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

			const eventBus = mock<MessageEventBus>();
			eventBus.sendAuditEvent.mockResolvedValue(undefined);
			const checkService = new CheckService(
				logger,
				service,
				Container.get(ClusterCheckMetadata),
				eventBus,
				mock<Push>(),
			);
			checkService.init();

			return {
				client,
				storage,
				service,
				task: new InstanceRegistryReconciliationTask(checkService),
				eventBus,
			};
		}

		const onMain = (i: number): Main => mains[i % MAINS];

		const mainInstanceKeys = (): string[] =>
			mains.map((main) => main.service.getLocalInstance().instanceKey);

		const roleOf = (instanceKey: string, leaders: Set<string>): 'leader' | 'follower' =>
			leaders.has(instanceKey) ? 'leader' : 'follower';

		async function registerAll(instanceKeys: string[], leaders: Set<string>): Promise<void> {
			await Promise.all(
				instanceKeys.map(
					async (k, i) => await onMain(i).storage.register(registration(k, roleOf(k, leaders))),
				),
			);
		}

		async function unregisterAll(instanceKeys: string[]): Promise<void> {
			await Promise.all(instanceKeys.map(async (k, i) => await onMain(i).storage.unregister(k)));
		}

		async function heartbeatAll(
			instanceKeys: string[],
			leaders: Set<string>,
			round: number,
		): Promise<void> {
			await Promise.all(
				instanceKeys.map(
					async (k, i) =>
						await onMain(i + round).storage.heartbeat(registration(k, roleOf(k, leaders))),
				),
			);
		}

		const runCycle = async (main: Main): Promise<void> =>
			await main.task.run(new AbortController().signal);

		async function runCyclesWhileRegistryChanges(opts: {
			live: string[];
			joining: string[];
			leaving: string[];
			leaders: Set<string>;
		}): Promise<void> {
			const live = new Set(opts.live);
			for (let round = 0; round < ROUNDS; round++) {
				const joining = everyNth(opts.joining, round);
				const leaving = everyNth(opts.leaving, round);
				for (const k of leaving) live.delete(k);
				await Promise.all([
					...mains.map(async (main) => await runCycle(main)),
					heartbeatAll([...live], opts.leaders, round),
					registerAll(joining, opts.leaders),
					unregisterAll(leaving),
				]);
				for (const k of joining) live.add(k);
			}
		}

		function auditEvents(): Array<{ eventName: string; payload: Record<string, unknown> }> {
			return mains
				.flatMap((main) => vi.mocked(main.eventBus.sendAuditEvent).mock.calls)
				.map(([event]) => event as { eventName: string; payload: Record<string, unknown> });
		}

		function instanceKeysIn(eventName: string): string[] {
			return sorted([
				...new Set(
					auditEvents()
						.filter((e) => e.eventName === eventName)
						.map((e) => e.payload.instanceKey as string),
				),
			]);
		}

		async function baselineInstanceKeys(): Promise<string[]> {
			const raw = await control.get(stateKey);
			return raw === null ? [] : sorted(Object.keys(JSON.parse(raw) as Record<string, unknown>));
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

		it('converges on one shared baseline and reports every change at least once when the registry changes while every main runs the cycle', async () => {
			const early = keys('early', 50);
			const late = keys('late', 30);
			const staying = early.slice(0, 30);
			const leaving = early.slice(30);
			const leaders = new Set([early[0]]);
			await registerAll(early, leaders);
			// Establish the baseline before first-round removals start.
			await runCycle(mains[0]);

			await runCyclesWhileRegistryChanges({ live: early, joining: late, leaving, leaders });
			await runCycle(mains[0]);

			expect(await baselineInstanceKeys()).toEqual(
				sorted([...staying, ...late, ...mainInstanceKeys()]),
			);
			expect(instanceKeysIn(AUDIT_JOINED)).toEqual(
				sorted([...early, ...late, ...mainInstanceKeys()]),
			);
			expect(instanceKeysIn(AUDIT_LEFT)).toEqual(expect.arrayContaining(leaving));
			expect(
				auditEvents().filter((e) => e.eventName === AUDIT_SPLIT_BRAIN_DETECTED).length,
			).toBeGreaterThanOrEqual(1);

			for (const main of mains) vi.mocked(main.eventBus.sendAuditEvent).mockClear();
			for (const main of mains) await runCycle(main);

			expect(auditEvents()).toEqual([]);
		});

		it('rejects the cycle and leaves the baseline untouched when Redis is unreachable', async () => {
			const [main] = mains;
			await runCycle(main);
			const baselineBefore = await control.get(stateKey);
			expect(baselineBefore).not.toBeNull();
			vi.mocked(main.eventBus.sendAuditEvent).mockClear();

			main.client.disconnect();
			await once(main.client, 'end');

			await expect(runCycle(main)).rejects.toThrow('Connection is closed.');
			expect(main.eventBus.sendAuditEvent).not.toHaveBeenCalled();
			expect(await control.get(stateKey)).toBe(baselineBefore);
		});
	},
);
