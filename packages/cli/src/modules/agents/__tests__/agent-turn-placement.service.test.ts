import { AGENT_TURNS_CAPABILITY, type InstanceRegistration } from '@n8n/api-types';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';

import type { AgentMainMemory } from '../queue/agent-main-memory.service';
import type { AgentQueueMetricEvent } from '../queue/agent-queue-metrics';
import { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import type { AgentTurnQueue } from '../queue/agent-turn-queue.service';
import { testCluster, type TestClusterOptions } from './test-utils/cluster';

function setup({
	cluster = { queue: true },
	queueModeEnabled = true,
	workerEnabled = true,
	instances = [] as Array<Partial<InstanceRegistration>>,
	registryFails = false,
	mainFallbackTurns = 5,
	mainMaxTurns = 20,
	memoryHigh = false,
	localTurns = 0,
	lastProgressAt,
	mainMaxIntake = 0,
	mainMaxStreams = 0,
}: {
	cluster?: TestClusterOptions;
	queueModeEnabled?: boolean;
	workerEnabled?: boolean;
	instances?: Array<Partial<InstanceRegistration>>;
	registryFails?: boolean;
	mainFallbackTurns?: number;
	mainMaxTurns?: number;
	memoryHigh?: boolean;
	localTurns?: number;
	/** When an agent job last started or ended anywhere. Omit for never. */
	lastProgressAt?: number;
	mainMaxIntake?: number;
	mainMaxStreams?: number;
} = {}) {
	const registry = new InstanceRegistryProxyService();
	const getAllInstances = vi.fn(async () => {
		if (registryFails) throw new Error('Redis unavailable');
		return instances as InstanceRegistration[];
	});
	registry.registerProvider({ getAllInstances, getLocalInstance: () => null });
	const config = {
		queueModeEnabled,
		workerEnabled,
		mainFallbackTurns,
		mainMaxTurns,
		mainMaxIntake,
		mainMaxStreams,
	} as AgentsConfig;
	const agentCluster = testCluster(cluster);
	agentCluster.metrics.registerGauges({ localTurns: () => localTurns });
	const events: AgentQueueMetricEvent[] = [];
	agentCluster.metrics.onEvent((event) => events.push(event));
	const turnQueue = { lastProgressAt } as AgentTurnQueue;
	const memory = { isHigh: () => memoryHigh } as AgentMainMemory;
	return {
		placement: new AgentTurnPlacement(config, agentCluster, registry, turnQueue, memory),
		getAllInstances,
		events,
	};
}

const agentWorker = { instanceType: 'worker' as const, capabilities: [AGENT_TURNS_CAPABILITY] };
const recent = () => new Date();
const old = () => new Date(Date.now() - AgentTurnPlacement.FALLBACK_WAIT_MS - 1);

describe('AgentTurnPlacement', () => {
	afterEach(() => vi.useRealTimers());

	it('dispatches only on a main in queue mode with the flag on', () => {
		expect(setup().placement.dispatchEnabled).toBe(true);
		expect(setup({ queueModeEnabled: false }).placement.dispatchEnabled).toBe(false);
		expect(setup({ cluster: { queue: false } }).placement.dispatchEnabled).toBe(false);
		expect(
			setup({ cluster: { queue: true, instanceType: 'worker' } }).placement.dispatchEnabled,
		).toBe(false);
	});

	it('runs turns only on a worker in queue mode with the worker flag on', () => {
		const worker = { queue: true, instanceType: 'worker' as const };
		expect(setup({ cluster: worker }).placement.runsTurnsOnWorker).toBe(true);
		expect(setup({ cluster: worker, workerEnabled: false }).placement.runsTurnsOnWorker).toBe(
			false,
		);
		expect(setup().placement.runsTurnsOnWorker).toBe(false);
	});

	it('finds workers only by the agent-turns capability', async () => {
		expect(await setup({ instances: [agentWorker] }).placement.workersAvailable()).toBe(true);
		expect(
			await setup({ instances: [{ instanceType: 'worker' }] }).placement.workersAvailable(),
		).toBe(false);
		expect(
			await setup({
				instances: [{ instanceType: 'main', capabilities: [AGENT_TURNS_CAPABILITY] }],
			}).placement.workersAvailable(),
		).toBe(false);
	});

	it('reads the registry at most once in the check window', async () => {
		vi.useFakeTimers();
		const { placement, getAllInstances } = setup({ instances: [agentWorker] });
		await Promise.all([placement.workersAvailable(), placement.workersAvailable()]);
		await placement.workersAvailable();
		expect(getAllInstances).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(AgentTurnPlacement.WORKER_CHECK_TTL_MS);
		await placement.workersAvailable();
		expect(getAllInstances).toHaveBeenCalledTimes(2);
	});

	it('treats a failed registry read as no workers, so mains run the turn', async () => {
		const { placement } = setup({ registryFails: true });
		expect(await placement.workersAvailable()).toBe(false);
		expect(await placement.mayClaim('preview', recent())).toBe(true);
	});

	describe('mayClaim on a main', () => {
		it('leaves a recent worker turn for a worker', async () => {
			const { placement } = setup({ instances: [agentWorker] });
			expect(await placement.mayClaim('preview', recent())).toBe(false);
			expect(await placement.mayClaim('n8n_chat', recent())).toBe(false);
			expect(placement.fallbackCount).toBe(0);
		});

		it('runs an overdue worker turn when the workers made no progress', async () => {
			const { placement, events } = setup({ instances: [agentWorker] });
			expect(await placement.mayClaim('preview', old())).toBe(true);
			expect(placement.fallbackCount).toBe(1);
			expect(events).toEqual([{ type: 'fallback', path: 'queued-message' }]);
		});

		it('leaves an overdue turn to workers that still start or finish jobs', async () => {
			const { placement, events } = setup({
				instances: [agentWorker],
				lastProgressAt: Date.now() - 1_000,
			});
			expect(await placement.mayClaim('preview', old())).toBe(false);
			expect(placement.fallbackCount).toBe(0);
			expect(events).toEqual([{ type: 'turn-held', reason: 'workers-progressing' }]);
		});

		it('takes over again once the workers stop making progress', async () => {
			const { placement } = setup({
				instances: [agentWorker],
				lastProgressAt: Date.now() - AgentTurnPlacement.FALLBACK_WAIT_MS - 1,
			});
			expect(await placement.mayClaim('preview', old())).toBe(true);
		});

		it('holds an overdue turn when this main is at its fallback limit', async () => {
			const { placement, events } = setup({
				instances: [agentWorker],
				mainFallbackTurns: 2,
				localTurns: 2,
			});
			expect(await placement.mayClaim('preview', old())).toBe(false);
			expect(events).toEqual([{ type: 'turn-held', reason: 'main-at-limit' }]);
		});

		it('holds an overdue turn when the memory of this main is high', async () => {
			const { placement, events } = setup({
				instances: [agentWorker],
				memoryHigh: true,
				localTurns: 1,
			});
			expect(await placement.mayClaim('preview', old())).toBe(false);
			expect(placement.fallbackCount).toBe(0);
			expect(events).toEqual([{ type: 'turn-held', reason: 'main-memory-high' }]);
		});

		it('counts takeovers that have not started yet toward the limit', async () => {
			vi.useFakeTimers();
			const { placement } = setup({ instances: [agentWorker], mainFallbackTurns: 2 });
			const checks = await Promise.all(
				[1, 2, 3].map(async () => await placement.mayClaim('preview', old())),
			);
			expect(checks).toEqual([true, true, false]);
			vi.advanceTimersByTime(AgentTurnPlacement.CLAIM_START_MS);
			expect(await placement.mayClaim('preview', old())).toBe(true);
		});

		it('ignores the fallback limit when no agent worker is registered', async () => {
			const { placement } = setup({ mainFallbackTurns: 1, localTurns: 10 });
			expect(await placement.mayFallBack(old().getTime(), 'request')).toBe(true);
			expect(await placement.mayFallBack(Date.now(), 'request')).toBe(false);
		});

		it('holds every kind at the turn limit of this main, with or without workers', async () => {
			for (const instances of [[], [agentWorker]]) {
				const { placement, events } = setup({ instances, mainMaxTurns: 3, localTurns: 3 });
				expect(await placement.mayClaim('system', recent())).toBe(false);
				expect(await placement.mayClaim('integration', recent(), 'discord')).toBe(false);
				expect(await placement.mayFallBack(old().getTime(), 'request')).toBe(false);
				expect(events.at(-1)).toEqual({ type: 'turn-held', reason: 'main-at-limit' });
			}
			const { placement } = setup({ mainMaxTurns: 3, localTurns: 3 });
			expect(await placement.mayClaim('preview', recent())).toBe(false);
		});

		it('counts turns that have not started yet toward the turn limit', async () => {
			vi.useFakeTimers();
			const { placement } = setup({ mainMaxTurns: 2 });
			const queuedAt = recent();
			const checks = await Promise.all(
				[1, 2, 3].map(async () => await placement.mayClaim('preview', queuedAt)),
			);
			expect(checks).toEqual([true, true, false]);
			vi.advanceTimersByTime(AgentTurnPlacement.CLAIM_START_MS);
			expect(await placement.mayClaim('preview', queuedAt)).toBe(true);
		});

		it('stops counting a claim once the caller reports that it settled', async () => {
			const { placement } = setup({ mainMaxTurns: 1 });
			expect(await placement.mayClaim('preview', recent())).toBe(true);
			expect(await placement.mayClaim('preview', recent())).toBe(false);
			placement.claimSettled();
			expect(await placement.mayClaim('preview', recent())).toBe(true);
		});

		it('lets a held turn go before a newer turn when room frees up', async () => {
			vi.useFakeTimers();
			const { placement } = setup({ mainMaxTurns: 1 });
			const older = new Date(Date.now() - 2_000);
			const newer = new Date(Date.now() - 1_000);
			expect(await placement.mayClaim('preview', recent())).toBe(true);
			expect(await placement.mayClaim('preview', older)).toBe(false);
			expect(placement.hasHeldTurns).toBe(true);

			placement.claimSettled();
			expect(await placement.mayClaim('preview', newer)).toBe(false);
			expect(await placement.mayClaim('preview', older)).toBe(true);

			// A held turn that nobody checks again, for example a cancelled one, loses its place.
			placement.claimSettled();
			vi.advanceTimersByTime(AgentTurnPlacement.HELD_TTL_MS);
			expect(placement.hasHeldTurns).toBe(false);
			expect(await placement.mayClaim('preview', new Date())).toBe(true);
		});

		it('holds a turn while memory is high, but always runs one turn', async () => {
			const busy = setup({ memoryHigh: true, localTurns: 1 });
			expect(await busy.placement.mayClaim('system', recent())).toBe(false);
			expect(busy.events).toEqual([{ type: 'turn-held', reason: 'main-memory-high' }]);

			const idle = setup({ memoryHigh: true });
			expect(await idle.placement.mayClaim('system', recent())).toBe(true);
			expect(await idle.placement.mayClaim('system', recent())).toBe(false);
		});

		it('applies no limit without agent queue mode', async () => {
			for (const options of [{ queueModeEnabled: false }, { cluster: { queue: false } }]) {
				const { placement, events } = setup({
					...options,
					mainMaxTurns: 1,
					localTurns: 50,
					memoryHigh: true,
				});
				expect(await placement.mayClaim('preview', recent())).toBe(true);
				expect(placement.openStream()).toBeDefined();
				expect(events).toEqual([]);
			}
		});

		it('opens no live stream while memory is high', () => {
			expect(setup().placement.openStream()).toBeDefined();
			const { placement, events } = setup({ memoryHigh: true });
			expect(placement.openStream()).toBeUndefined();
			expect(events).toEqual([{ type: 'stream-skipped', reason: 'main-memory-high' }]);
		});

		it('opens no more live streams than the limit, and frees a place when one closes', () => {
			const { placement, events } = setup({ mainMaxStreams: 2 });
			const first = placement.openStream();
			expect(placement.openStream()).toBeDefined();
			expect(placement.openStream()).toBeUndefined();
			expect(events).toEqual([{ type: 'stream-skipped', reason: 'main-at-stream-limit' }]);

			first?.();
			first?.();
			expect(placement.openStream()).toBeDefined();
			expect(placement.openStream()).toBeUndefined();
		});
	});

	describe('enterIntake', () => {
		const signal = () => new AbortController().signal;

		it('applies no limit without agent queue mode or with a limit of 0', async () => {
			for (const options of [{ queueModeEnabled: false, mainMaxIntake: 1 }, { mainMaxIntake: 0 }]) {
				const { placement } = setup(options);
				expect(await placement.enterIntake(signal())).toBeDefined();
				expect(await placement.enterIntake(signal())).toBeDefined();
			}
		});

		it('lets a waiting message in, in order, when a place is freed', async () => {
			const { placement } = setup({ mainMaxIntake: 1 });
			const leave = await placement.enterIntake(signal());
			const order: string[] = [];
			const second = placement.enterIntake(signal()).then((r) => {
				order.push('second');
				return r;
			});
			const third = placement.enterIntake(signal()).then((r) => {
				order.push('third');
				return r;
			});

			leave?.();
			leave?.();
			const leaveSecond = await second;
			expect(leaveSecond).toBeDefined();
			expect(order).toEqual(['second']);

			leaveSecond?.();
			expect(await third).toBeDefined();
			expect(order).toEqual(['second', 'third']);
		});

		it('rejects a message that waits too long', async () => {
			vi.useFakeTimers();
			const { placement, events } = setup({ mainMaxIntake: 1 });
			const leave = await placement.enterIntake(signal());
			const waiting = placement.enterIntake(signal());
			vi.advanceTimersByTime(AgentTurnPlacement.INTAKE_WAIT_MS);
			expect(await waiting).toBeUndefined();
			expect(events).toEqual([{ type: 'intake-rejected' }]);

			// The rejected message does not keep a place.
			leave?.();
			expect(await placement.enterIntake(signal())).toBeDefined();
		});

		it('drops a waiting message when its request is aborted', async () => {
			const { placement, events } = setup({ mainMaxIntake: 1 });
			const leave = await placement.enterIntake(signal());
			const controller = new AbortController();
			const waiting = placement.enterIntake(controller.signal);
			controller.abort();
			expect(await waiting).toBeUndefined();
			expect(events).toEqual([]);

			leave?.();
			expect(await placement.enterIntake(signal())).toBeDefined();
			expect(await placement.enterIntake(controller.signal)).toBeUndefined();
		});
	});

	describe('mayClaim on a main, by kind', () => {
		it('runs every kind when no agent worker is registered', async () => {
			const { placement } = setup();
			expect(await placement.mayClaim('preview', recent())).toBe(true);
			expect(placement.fallbackCount).toBe(0);
		});

		it('keeps system turns and turns of main-only platforms on mains', async () => {
			const { placement } = setup({ instances: [agentWorker] });
			expect(await placement.mayClaim('system', recent())).toBe(true);
			expect(await placement.mayClaim('integration', recent(), 'discord')).toBe(true);
			expect(await placement.mayClaim('integration', recent(), 'whatsapp')).toBe(true);
		});

		it('leaves recent turns of send-only platforms to workers', async () => {
			const { placement } = setup({ instances: [agentWorker] });
			expect(await placement.mayClaim('integration', recent(), 'slack')).toBe(false);
			expect(await placement.mayClaim('integration', recent(), 'telegram')).toBe(false);
		});
	});

	describe('mayClaim on a worker', () => {
		const worker = { queue: true, instanceType: 'worker' as const };

		it('claims worker kinds only', async () => {
			const { placement } = setup({ cluster: worker });
			expect(await placement.mayClaim('preview', recent())).toBe(true);
			expect(await placement.mayClaim('n8n_chat', recent())).toBe(true);
			expect(await placement.mayClaim('system', recent())).toBe(false);
			expect(await placement.mayClaim('integration', recent())).toBe(false);
			expect(await placement.mayClaim('integration', recent(), 'discord')).toBe(false);
		});

		it('claims integration turns of send-only platforms', async () => {
			const { placement } = setup({ cluster: worker });
			for (const platform of ['slack', 'teams', 'telegram', 'linear']) {
				expect(await placement.mayClaim('integration', recent(), platform)).toBe(true);
			}
		});

		it('claims nothing with the worker flag off', async () => {
			const { placement } = setup({ cluster: worker, workerEnabled: false });
			expect(await placement.mayClaim('preview', recent())).toBe(false);
		});
	});
});
