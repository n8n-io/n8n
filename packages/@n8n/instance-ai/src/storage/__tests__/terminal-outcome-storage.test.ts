import type { Memory } from '@mastra/memory';

jest.mock('../thread-patch', () => ({
	patchThread: jest.fn(),
}));

import { TerminalOutcomeStorage, type TerminalOutcome } from '../terminal-outcome-storage';
import { patchThread } from '../thread-patch';

const mockedPatchThread = jest.mocked(patchThread);

function makeMemory(): Memory {
	return {
		getThreadById: jest.fn(),
	} as unknown as Memory;
}

function makeOutcome(overrides: Partial<TerminalOutcome> = {}): TerminalOutcome {
	return {
		id: 'outcome-1',
		threadId: 'thread-1',
		runId: 'run-1',
		taskId: 'task-1',
		agentId: 'agent-1',
		status: 'completed',
		userFacingMessage: 'done',
		createdAt: '2026-05-02T00:00:00.000Z',
		...overrides,
	};
}

describe('TerminalOutcomeStorage', () => {
	let memory: Memory;
	let storage: TerminalOutcomeStorage;

	beforeEach(() => {
		jest.clearAllMocks();
		memory = makeMemory();
		storage = new TerminalOutcomeStorage(memory);
	});

	describe('getUndelivered()', () => {
		it('returns valid undelivered outcomes when one stored entry is malformed', async () => {
			const valid = makeOutcome({ id: 'outcome-valid' });
			(memory.getThreadById as jest.Mock).mockResolvedValue({
				metadata: {
					instanceAiTerminalOutcomes: {
						'outcome-valid': valid,
						'outcome-broken': { id: 'outcome-broken' },
					},
				},
			});

			const result = await storage.getUndelivered('thread-1');

			expect(result).toEqual([valid]);
		});

		it('returns empty list when metadata is missing', async () => {
			(memory.getThreadById as jest.Mock).mockResolvedValue({ metadata: {} });

			const result = await storage.getUndelivered('thread-1');

			expect(result).toEqual([]);
		});

		it('skips delivered outcomes', async () => {
			const undelivered = makeOutcome({ id: 'undelivered' });
			const delivered = makeOutcome({
				id: 'delivered',
				deliveredAt: '2026-05-02T00:00:01.000Z',
			});
			(memory.getThreadById as jest.Mock).mockResolvedValue({
				metadata: {
					instanceAiTerminalOutcomes: {
						undelivered,
						delivered,
					},
				},
			});

			const result = await storage.getUndelivered('thread-1');

			expect(result).toEqual([undelivered]);
		});
	});

	describe('upsert()', () => {
		it('preserves valid outcomes when an existing entry is malformed', async () => {
			const valid = makeOutcome({ id: 'outcome-valid' });
			const next = makeOutcome({ id: 'outcome-new' });

			let captured: Record<string, unknown> | undefined;
			mockedPatchThread.mockImplementation(async (_memory, args) => {
				await Promise.resolve();
				const patch = args.update({
					metadata: {
						instanceAiTerminalOutcomes: {
							'outcome-valid': valid,
							'outcome-broken': { not: 'an outcome' },
						},
					},
				} as unknown as Parameters<typeof args.update>[0]);
				captured = patch?.metadata?.instanceAiTerminalOutcomes as Record<string, unknown>;
				return null;
			});

			await storage.upsert('thread-1', next);

			expect(captured).toEqual({
				'outcome-valid': valid,
				'outcome-new': next,
			});
		});
	});
});
