import { AGENT_TURNS_CAPABILITY, type InstanceRegistration } from '@n8n/api-types';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';

import type { AgentMainMemory } from '../queue/agent-main-memory.service';
import type { AgentQueueMetricEvent } from '../queue/agent-queue-metrics';
import { AgentTurnGate } from '../queue/agent-turn-gate.service';
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
	queueMaxWaiting = 0,
	waitingInQueue = 0,
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
	queueMaxWaiting?: number;
	/** Jobs that wait in the shared agent queue. */
	waitingInQueue?: number;
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
		mainMaxIntake: 0,
		mainMaxStreams: 0,
		queueMaxWaiting,
		queueMaxWaitSeconds: 60,
	} as AgentsConfig;
	const agentCluster = testCluster(cluster);
	agentCluster.metrics.registerGauges({ localTurns: () => localTurns });
	const events: AgentQueueMetricEvent[] = [];
	agentCluster.metrics.onEvent((event) => events.push(event));
	const turnQueue = {
		lastProgressAt,
		waitingCount: async () => waitingInQueue,
	} as AgentTurnQueue;
	const memory = { isHigh: () => memoryHigh } as AgentMainMemory;
	const gate = new AgentTurnGate(config, agentCluster.metrics, memory);
	return {
		placement: new AgentTurnPlacement(config, agentCluster, registry, turnQueue, gate),
		gate,
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

	describe('goesToWorker', () => {
		it('sends worker kinds to workers only when a worker is up', async () => {
			expect(await setup({ instances: [agentWorker] }).placement.goesToWorker('preview')).toBe(
				true,
			);
			expect(await setup().placement.goesToWorker('preview')).toBe(false);
			expect(await setup({ instances: [agentWorker] }).placement.goesToWorker('system')).toBe(
				false,
			);
		});

		it('keeps every kind on the main without agent queue mode', async () => {
			const { placement } = setup({ queueModeEnabled: false, instances: [agentWorker] });
			expect(await placement.goesToWorker('preview')).toBe(false);
		});
	});

	describe('queueFull', () => {
		it('counts the shared agent queue for turns that go to workers', async () => {
			const { placement, events } = setup({ queueMaxWaiting: 3, waitingInQueue: 3 });
			expect(await placement.queueFull(true)).toBe(true);
			expect(events).toEqual([{ type: 'turn-rejected', reason: 'queue-full' }]);
		});

		it('counts the turns that wait on this main for turns that run here', async () => {
			const { placement } = setup({ queueMaxWaiting: 3, waitingInQueue: 10 });
			expect(await placement.queueFull(false)).toBe(false);
		});

		it('never reports a full queue with a limit of 0', async () => {
			const { placement } = setup({ queueMaxWaiting: 0, waitingInQueue: 1_000 });
			expect(await placement.queueFull(true)).toBe(false);
		});
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

		it('never takes over from a running worker with the default fallback limit of 0', async () => {
			const { placement, events } = setup({ instances: [agentWorker], mainFallbackTurns: 0 });
			expect(await placement.mayClaim('preview', old())).toBe(false);
			expect(events).toEqual([{ type: 'turn-held', reason: 'main-at-limit' }]);
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
			vi.advanceTimersByTime(AgentTurnGate.CLAIM_START_MS);
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

		it('applies the turn limit in regular mode too', async () => {
			for (const options of [{ queueModeEnabled: false }, { cluster: { queue: false } }]) {
				const { placement, events } = setup({ ...options, mainMaxTurns: 1, localTurns: 1 });
				expect(await placement.mayClaim('preview', recent())).toBe(false);
				expect(events).toEqual([{ type: 'turn-held', reason: 'main-at-limit' }]);
			}
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
