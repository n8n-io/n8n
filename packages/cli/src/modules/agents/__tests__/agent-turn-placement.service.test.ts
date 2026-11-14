import { AGENT_TURNS_CAPABILITY, type InstanceRegistration } from '@n8n/api-types';
import { InstanceRegistryProxyService } from '@n8n/backend-services';
import type { AgentsConfig } from '@n8n/config';

import { AgentTurnPlacement } from '../queue/agent-turn-placement.service';
import { testCluster, type TestClusterOptions } from './test-utils/cluster';

function setup({
	cluster = { queue: true },
	queueModeEnabled = true,
	workerEnabled = true,
	instances = [] as Array<Partial<InstanceRegistration>>,
	registryFails = false,
}: {
	cluster?: TestClusterOptions;
	queueModeEnabled?: boolean;
	workerEnabled?: boolean;
	instances?: Array<Partial<InstanceRegistration>>;
	registryFails?: boolean;
} = {}) {
	const registry = new InstanceRegistryProxyService();
	const getAllInstances = vi.fn(async () => {
		if (registryFails) throw new Error('Redis unavailable');
		return instances as InstanceRegistration[];
	});
	registry.registerProvider({ getAllInstances, getLocalInstance: () => null });
	const config = { queueModeEnabled, workerEnabled } as AgentsConfig;
	return {
		placement: new AgentTurnPlacement(config, testCluster(cluster), registry),
		getAllInstances,
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

		it('runs a worker turn that waited longer than the fallback wait', async () => {
			const { placement } = setup({ instances: [agentWorker] });
			expect(await placement.mayClaim('preview', old())).toBe(true);
			expect(placement.fallbackCount).toBe(1);
		});

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
