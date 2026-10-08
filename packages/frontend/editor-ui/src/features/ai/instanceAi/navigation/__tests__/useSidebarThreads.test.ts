import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import fc from 'fast-check';
import { INSTANCE_AI_THREAD_SERVER_STATES, type InstanceAiThreadSummary } from '@n8n/api-types';
import { useSidebarThreads, withLocalWork } from '../useSidebarThreads';

const { store } = vi.hoisted(() => ({
	store: {
		threads: [] as InstanceAiThreadSummary[],
		getRuntime: vi.fn(),
	},
}));

vi.mock('../../instanceAi.store', () => ({ useInstanceAiStore: () => store }));

const T0 = '2026-03-01T10:00:00.000Z';

function chat(
	id: string,
	overview: Partial<InstanceAiThreadSummary> = {},
): InstanceAiThreadSummary {
	return { id, title: `Chat ${id}`, createdAt: T0, updatedAt: T0, ...overview };
}

describe('withLocalWork', () => {
	it('marks the working chat without a server state as working', () => {
		const threads = [chat('new'), chat('old')];

		expect(withLocalWork(threads, 'new')).toEqual([chat('new', { state: 'working' }), chat('old')]);
	});

	it.each([
		['a state', { state: 'idle' as const }],
		['a pending question', { needsInput: true }],
		['no pending question', { needsInput: false }],
	])('keeps a chat that the server sent with %s', (_, overview) => {
		const threads = [chat('new', overview)];

		expect(withLocalWork(threads, 'new')).toEqual(threads);
	});

	it('returns the same list when no chat works in this tab', () => {
		const threads = [chat('new')];

		expect(withLocalWork(threads, undefined)).toBe(threads);
	});

	it('does not change the list it gets', () => {
		const threads = [chat('new')];

		withLocalWork(threads, 'new');

		expect(threads).toEqual([chat('new')]);
	});

	const overviewArb = fc.record({
		state: fc.option(fc.constantFrom(...INSTANCE_AI_THREAD_SERVER_STATES), { nil: undefined }),
		needsInput: fc.option(fc.boolean(), { nil: undefined }),
	});
	const inputArb = fc.record({
		rows: fc.uniqueArray(fc.tuple(fc.integer({ min: 0, max: 20 }), overviewArb), {
			selector: ([id]) => id,
			maxLength: 10,
		}),
		workingId: fc.option(fc.integer({ min: 0, max: 20 }), { nil: undefined }),
	});

	it('changes at most the state of the working chat, and only when the server sent none', () => {
		fc.assert(
			fc.property(inputArb, ({ rows, workingId }) => {
				const threads = rows.map(([id, overview]) => chat(`t${id}`, overview));
				const workingThreadId = workingId === undefined ? undefined : `t${workingId}`;

				const result = withLocalWork(threads, workingThreadId);

				expect(result.map((thread) => thread.id)).toEqual(threads.map((thread) => thread.id));
				result.forEach((thread, index) => {
					const before = threads[index];
					const takesLocalState =
						before.id === workingThreadId &&
						before.state === undefined &&
						before.needsInput === undefined;
					expect(thread).toEqual(takesLocalState ? { ...before, state: 'working' } : before);
				});
			}),
		);
	});
});

describe('useSidebarThreads', () => {
	beforeEach(() => {
		store.threads = [chat('new'), chat('old')];
		store.getRuntime.mockReset();
	});

	function runtime(values: { isStreaming: boolean; isSendingMessage: boolean }) {
		const state = reactive(values);
		store.getRuntime.mockImplementation((threadId: string) =>
			threadId === 'new' ? state : undefined,
		);
		return state;
	}

	const states = (threads: InstanceAiThreadSummary[]) => threads.map((thread) => thread.state);

	it('shows the open chat as working while it streams or sends a message', () => {
		const state = runtime({ isStreaming: true, isSendingMessage: false });
		const threads = useSidebarThreads(ref('new'));
		expect(states(threads.value)).toEqual(['working', undefined]);

		state.isStreaming = false;
		expect(states(threads.value)).toEqual([undefined, undefined]);

		state.isSendingMessage = true;
		expect(states(threads.value)).toEqual(['working', undefined]);
	});

	it('reads the runtime of the open chat only', () => {
		runtime({ isStreaming: true, isSendingMessage: true });
		const openThreadId = ref<string | undefined>('old');
		const threads = useSidebarThreads(openThreadId);
		expect(states(threads.value)).toEqual([undefined, undefined]);
		expect(store.getRuntime).toHaveBeenCalledWith('old');

		openThreadId.value = undefined;
		expect(states(threads.value)).toEqual([undefined, undefined]);
	});

	it('shows the store list as it is when the open chat has no runtime', () => {
		const threads = useSidebarThreads(ref('new'));

		expect(threads.value).toBe(store.threads);
	});
});
