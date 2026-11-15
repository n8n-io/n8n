import type { AgentsConfig } from '@n8n/config';

import { readMemoryUsage } from '@/memory-guard/memory-usage';

import { AgentMainMemory } from '../queue/agent-main-memory.service';

vi.mock('@/memory-guard/memory-usage', () => ({
	getContainerLimit: vi.fn(),
	getOldGenerationLimit: vi.fn(() => 1),
	readMemoryUsage: vi.fn(),
}));

describe('AgentMainMemory', () => {
	const read = vi.mocked(readMemoryUsage);

	const setup = (mainMemoryHoldLevel: number, utilization: number) => {
		read.mockReturnValue({ utilization, usedBytes: 0, limitBytes: 0 });
		return new AgentMainMemory({ mainMemoryHoldLevel } as AgentsConfig);
	};

	beforeEach(() => read.mockReset());
	afterEach(() => vi.useRealTimers());

	it('is high at or above the hold level', () => {
		expect(setup(0.8, 0.79).isHigh()).toBe(false);
		expect(setup(0.8, 0.8).isHigh()).toBe(true);
	});

	it('is never high with a hold level of 1', () => {
		expect(setup(1, 1).isHigh()).toBe(false);
		expect(read).not.toHaveBeenCalled();
	});

	it('reads memory at most once in the read window', () => {
		vi.useFakeTimers();
		const memory = setup(0.8, 0.9);
		expect(memory.isHigh()).toBe(true);
		read.mockReturnValue({ utilization: 0.1, usedBytes: 0, limitBytes: 0 });
		expect(memory.isHigh()).toBe(true);
		expect(read).toHaveBeenCalledOnce();

		vi.advanceTimersByTime(AgentMainMemory.READ_TTL_MS);
		expect(memory.isHigh()).toBe(false);
	});
});
