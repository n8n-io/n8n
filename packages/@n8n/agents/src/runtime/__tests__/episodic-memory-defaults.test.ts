import type * as AiImport from 'ai';

import type { ModelConfig } from '../../types';
import type { BilledUsageCollector } from '../../types/runtime/agent-runtime';
import { createEpisodicMemoryReflectFn } from '../memory/episodic-memory-defaults';

type GenerateTextCall = {
	output: {
		schema: {
			parse(value: unknown): unknown;
		};
	};
};

type OutputObjectOptions = {
	schema: {
		parse(value: unknown): unknown;
	};
};

type GenerateTextResult = { output: unknown; usage?: { totalTokens?: number } };

const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(...args: [GenerateTextCall]) => Promise<GenerateTextResult>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		Output: {
			...actual.Output,
			object: ({ schema }: OutputObjectOptions) => ({ schema }),
		},
		generateText: async (call: GenerateTextCall): Promise<GenerateTextResult> =>
			await mockGenerateText(call),
	};
});

const fakeModel = { doGenerate: vi.fn() } as unknown as ModelConfig;

describe('episodic memory defaults', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('rejects reflection merges without superseded entry IDs', async () => {
		mockGenerateText.mockImplementation(async ({ output }) => {
			const parsedOutput = output.schema.parse({
				drop: [],
				merge: [
					{
						supersedes: [],
						content: 'User chose Postgres for the memory store.',
					},
				],
			});
			return await Promise.resolve({
				output: parsedOutput,
				finalStep: { providerMetadata: undefined },
			});
		});

		await expect(
			createEpisodicMemoryReflectFn(fakeModel)({
				scope: { resourceId: 'user-1', threadId: 'thread-1' },
				now: new Date('2026-05-12T15:00:00.000Z'),
				seedEntryIds: [],
				entries: [],
				sources: [],
			}),
		).rejects.toThrow();
	});

	it('counts reflection generation tokens when usage is available', async () => {
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};

		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			const parsedOutput = output.schema.parse({ drop: [], merge: [] });
			return await Promise.resolve({
				output: parsedOutput,
				usage: { totalTokens: 13 },
				finalStep: { providerMetadata: undefined },
			});
		});

		await createEpisodicMemoryReflectFn(fakeModel)({
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: [],
			entries: [],
			sources: [],
			executionCounter: counter,
		});

		expect(counter.incrementTokenCount).toHaveBeenCalledWith(13);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});

	it('settles the billed amount for a gateway-managed reflect model, even without token usage', async () => {
		const gatewayModel = { doGenerate: vi.fn(), gatewayManaged: true } as unknown as ModelConfig;
		const window = { wrap: vi.fn(() => vi.fn()), settle: vi.fn(() => 0.002) };
		const collector: BilledUsageCollector = { startWindow: vi.fn(() => window) };
		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			return await Promise.resolve({
				output: output.schema.parse({ drop: [], merge: [] }),
				usage: undefined,
				finalStep: { providerMetadata: undefined },
			});
		});

		const result = await createEpisodicMemoryReflectFn(gatewayModel, {
			billedUsage: collector,
		})({
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: [],
			entries: [],
			sources: [],
		});

		expect(collector.startWindow).toHaveBeenCalledTimes(1);
		if (!('reflection' in result)) throw new Error('Expected a reflect result object');
		expect(result.billedCostUsd).toBe(0.002);
		// The call carried no token usage: the cost rides a zero-token record.
		expect(result.usage).toMatchObject({ promptTokens: 0, cost: 0.002 });
	});

	it('opens no window for an own-key reflect model', async () => {
		const collector: BilledUsageCollector = { startWindow: vi.fn() };
		mockGenerateText.mockImplementationOnce(async ({ output }) => {
			return await Promise.resolve({
				output: output.schema.parse({ drop: [], merge: [] }),
				usage: { totalTokens: 13 },
				finalStep: { providerMetadata: undefined },
			});
		});

		const result = await createEpisodicMemoryReflectFn(fakeModel, {
			billedUsage: collector,
		})({
			scope: { resourceId: 'user-1', threadId: 'thread-1' },
			now: new Date('2026-05-12T15:00:00.000Z'),
			seedEntryIds: [],
			entries: [],
			sources: [],
		});

		expect(collector.startWindow).not.toHaveBeenCalled();
		if (!('reflection' in result)) throw new Error('Expected a reflect result object');
		expect(result.billedCostUsd).toBeUndefined();
	});
});
