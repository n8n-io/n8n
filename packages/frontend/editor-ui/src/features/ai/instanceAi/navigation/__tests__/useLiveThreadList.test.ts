import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, nextTick, ref, type EffectScope, type Ref } from 'vue';
import type { PushMessage } from '@n8n/api-types';
import { ASSISTANT_AGENT_ID } from '../../agentsChatMode';
import { isAssistantThreadEvent, useLiveThreadList } from '../useLiveThreadList';

const { pushHandlers, pushStore, loadThreads } = vi.hoisted(() => {
	const handlers = new Set<(event: PushMessage) => void>();
	return {
		pushHandlers: handlers,
		loadThreads: vi.fn(async () => true),
		pushStore: {
			pushConnect: vi.fn(),
			pushDisconnect: vi.fn(),
			addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
				handlers.add(handler);
				return () => handlers.delete(handler);
			}),
		},
	};
});

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => pushStore,
}));

vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({ loadThreads }),
}));

const executionUpdated = (agentId = ASSISTANT_AGENT_ID): PushMessage => ({
	type: 'agentExecutionUpdated',
	data: { projectId: 'p1', agentId, threadId: 't1', executionId: 'e1' },
});

const backgroundTasksUpdated = (agentId = ASSISTANT_AGENT_ID): PushMessage => ({
	type: 'agentBackgroundTasksUpdated',
	data: { projectId: 'p1', agentId, threadId: 't1' },
});

function emit(event: PushMessage) {
	for (const handler of [...pushHandlers]) handler(event);
}

let scopes: EffectScope[] = [];

function mount(enabled: Ref<boolean> | boolean = true) {
	const scope = effectScope();
	scopes.push(scope);
	scope.run(() => useLiveThreadList(enabled));
	return scope;
}

describe('useLiveThreadList', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		pushHandlers.clear();
	});

	afterEach(() => {
		for (const scope of scopes) scope.stop();
		scopes = [];
		vi.useRealTimers();
	});

	it('reloads the chat list once, one second after an event', () => {
		mount();

		emit(executionUpdated());
		vi.advanceTimersByTime(999);
		expect(loadThreads).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(loadThreads).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(5000);
		expect(loadThreads).toHaveBeenCalledTimes(1);
	});

	it('reloads for a change to the background tasks of an Assistant chat', () => {
		mount();

		emit(backgroundTasksUpdated());
		vi.advanceTimersByTime(1000);

		expect(loadThreads).toHaveBeenCalledTimes(1);
	});

	it('reloads once for ten events within one second', () => {
		mount();

		for (let index = 0; index < 10; index++) {
			emit(index % 2 === 0 ? executionUpdated() : backgroundTasksUpdated());
			vi.advanceTimersByTime(90);
		}
		vi.advanceTimersByTime(5000);

		expect(loadThreads).toHaveBeenCalledTimes(1);
	});

	it('reloads once a second while events keep coming, and covers the last event', () => {
		mount();
		const reloadTimes: number[] = [];
		loadThreads.mockImplementation(async () => {
			reloadTimes.push(Date.now());
			return true;
		});
		const start = Date.now();

		// A turn that writes a step every 200 ms for 5 seconds.
		for (let index = 0; index < 25; index++) {
			emit(executionUpdated());
			vi.advanceTimersByTime(200);
		}
		vi.advanceTimersByTime(5000);

		expect(reloadTimes.map((time) => time - start)).toEqual([1000, 2000, 3000, 4000, 5000]);
	});

	it.each<[string, PushMessage]>([
		['an execution of another agent', executionUpdated('other-agent')],
		['background tasks of another agent', backgroundTasksUpdated('other-agent')],
		[
			'an agent update',
			{ type: 'agentUpdated', data: { projectId: 'p1', agentId: ASSISTANT_AGENT_ID } },
		],
		[
			'a message queue update',
			{
				type: 'agentMessageQueueUpdated',
				data: { projectId: 'p1', agentId: ASSISTANT_AGENT_ID, threadId: 't1' },
			},
		],
		['a workflow execution', { type: 'executionRecovered', data: { executionId: 'e1' } }],
	])('does not reload for %s', (_, event) => {
		mount();

		emit(event);
		vi.advanceTimersByTime(5000);

		expect(loadThreads).not.toHaveBeenCalled();
	});

	it('opens the push connection while it listens, and closes its share on unmount', () => {
		const scope = mount();

		expect(pushStore.pushConnect).toHaveBeenCalledTimes(1);
		expect(pushHandlers.size).toBe(1);

		scope.stop();

		expect(pushStore.pushDisconnect).toHaveBeenCalledTimes(1);
		expect(pushHandlers.size).toBe(0);
	});

	it('does not reload after unmount, even for an event that came before', () => {
		const scope = mount();

		emit(executionUpdated());
		scope.stop();
		vi.advanceTimersByTime(5000);

		expect(loadThreads).not.toHaveBeenCalled();
	});

	it('does not subscribe or connect while the flag is off', () => {
		mount(false);

		emit(executionUpdated());
		vi.advanceTimersByTime(5000);

		expect(pushStore.addEventListener).not.toHaveBeenCalled();
		expect(pushStore.pushConnect).not.toHaveBeenCalled();
		expect(loadThreads).not.toHaveBeenCalled();
	});

	it('subscribes when the flag turns on, and stops when it turns off', async () => {
		const enabled = ref(false);
		const scope = mount(enabled);

		enabled.value = true;
		await nextTick();
		emit(executionUpdated());
		vi.advanceTimersByTime(1000);
		expect(loadThreads).toHaveBeenCalledTimes(1);

		emit(executionUpdated());
		enabled.value = false;
		await nextTick();
		vi.advanceTimersByTime(5000);
		expect(loadThreads).toHaveBeenCalledTimes(1);
		expect(pushHandlers.size).toBe(0);

		scope.stop();
		expect(pushStore.pushConnect).toHaveBeenCalledTimes(1);
		expect(pushStore.pushDisconnect).toHaveBeenCalledTimes(1);
	});

	it('keeps one subscription when the flag turns on again', async () => {
		const enabled = ref(true);
		const scope = mount(enabled);

		enabled.value = false;
		await nextTick();
		enabled.value = true;
		await nextTick();
		scope.stop();

		expect(pushStore.pushConnect).toHaveBeenCalledTimes(2);
		expect(pushStore.pushDisconnect).toHaveBeenCalledTimes(2);
		expect(pushHandlers.size).toBe(0);
	});
});

describe('isAssistantThreadEvent', () => {
	it('accepts execution and background task updates of the Assistant only', () => {
		expect(isAssistantThreadEvent(executionUpdated())).toBe(true);
		expect(isAssistantThreadEvent(backgroundTasksUpdated())).toBe(true);
		expect(isAssistantThreadEvent(executionUpdated('agent-2'))).toBe(false);
		expect(isAssistantThreadEvent(backgroundTasksUpdated('agent-2'))).toBe(false);
	});
});
