import type { Memory } from '@mastra/memory';
import type { PlanObject } from '@n8n/api-types';

import { MastraPlanStorage } from '../plan-storage';

function createMockMemory() {
	return {
		getThreadById: jest.fn(),
		updateThread: jest.fn(),
	} as unknown as jest.Mocked<Pick<Memory, 'getThreadById' | 'updateThread'>> & Memory;
}

function makeValidPlan(): PlanObject {
	return {
		goal: 'Test goal',
		currentPhase: 'build' as const,
		iteration: 0,
		steps: [{ phase: 'build', description: 'Step 1', status: 'pending' as const }],
	};
}

function makeThread(overrides: Record<string, unknown> = {}) {
	return {
		id: 'tid',
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		metadata: {},
		...overrides,
	};
}

describe('MastraPlanStorage', () => {
	let memory: ReturnType<typeof createMockMemory>;
	let storage: MastraPlanStorage;

	beforeEach(() => {
		memory = createMockMemory();
		storage = new MastraPlanStorage(memory);
	});

	describe('get', () => {
		it('should return PlanObject when metadata contains valid plan data', async () => {
			const validPlan = makeValidPlan();
			memory.getThreadById.mockResolvedValue(
				makeThread({ metadata: { instanceAiPlan: validPlan } }),
			);

			const result = await storage.get('tid');

			expect(result).toEqual(validPlan);
		});

		it('should return null when metadata key is missing', async () => {
			memory.getThreadById.mockResolvedValue(makeThread());

			const result = await storage.get('tid');

			expect(result).toBeNull();
		});

		it('should return null when metadata is corrupted (safeParse rejects)', async () => {
			memory.getThreadById.mockResolvedValue(
				makeThread({ metadata: { instanceAiPlan: { invalid: true } } }),
			);

			const result = await storage.get('tid');

			expect(result).toBeNull();
		});
	});

	describe('save', () => {
		it('should throw when thread not found', async () => {
			memory.getThreadById.mockResolvedValue(null);

			await expect(storage.save('tid', makeValidPlan())).rejects.toThrow('Thread tid not found');
		});

		it('should preserve existing metadata fields alongside plan', async () => {
			const validPlan = makeValidPlan();
			memory.getThreadById.mockResolvedValue(
				makeThread({ title: 'Test', metadata: { otherKey: 'value' } }),
			);

			await storage.save('tid', validPlan);

			expect(memory.updateThread).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'tid',
					title: 'Test',
					metadata: {
						otherKey: 'value',
						instanceAiPlan: validPlan,
					},
				}),
			);
		});
	});
});
