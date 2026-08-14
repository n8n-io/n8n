vi.mock('../thread-patch', () => ({
	getThread: vi.fn(),
	patchThread: vi.fn(),
}));

import { TerminalOutcomeStorage, type TerminalOutcome } from '../terminal-outcome-storage';
import { getThread, patchThread, type PatchableThreadMemory } from '../thread-patch';

const mockedGetThread = vi.mocked(getThread);
const mockedPatchThread = vi.mocked(patchThread);

function makeMemory(): PatchableThreadMemory {
	return {};
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

function makeThread(metadata: Record<string, unknown>): Awaited<ReturnType<typeof getThread>> {
	return {
		id: 'thread-1',
		title: 'Thread',
		metadata,
		resourceId: 'resource-1',
		createdAt: new Date('2026-05-02T00:00:00.000Z'),
		updatedAt: new Date('2026-05-02T00:00:00.000Z'),
	};
}

describe('TerminalOutcomeStorage', () => {
	let memory: PatchableThreadMemory;
	let storage: TerminalOutcomeStorage;

	beforeEach(() => {
		vi.clearAllMocks();
		memory = makeMemory();
		storage = new TerminalOutcomeStorage(memory);
	});

	describe('getUndelivered()', () => {
		it('returns valid undelivered outcomes when one stored entry is malformed', async () => {
			const valid = makeOutcome({ id: 'outcome-valid' });
			mockedGetThread.mockResolvedValue(
				makeThread({
					instanceAiTerminalOutcomes: {
						'outcome-valid': valid,
						'outcome-broken': { id: 'outcome-broken' },
					},
				}),
			);

			const result = await storage.getUndelivered('thread-1');

			expect(result).toEqual([valid]);
		});

		it('returns empty list when metadata is missing', async () => {
			mockedGetThread.mockResolvedValue(makeThread({}));

			const result = await storage.getUndelivered('thread-1');

			expect(result).toEqual([]);
		});

		it('skips delivered outcomes', async () => {
			const undelivered = makeOutcome({ id: 'undelivered' });
			const delivered = makeOutcome({
				id: 'delivered',
				deliveredAt: '2026-05-02T00:00:01.000Z',
			});
			mockedGetThread.mockResolvedValue(
				makeThread({
					instanceAiTerminalOutcomes: {
						undelivered,
						delivered,
					},
				}),
			);

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
