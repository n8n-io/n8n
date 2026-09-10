import type {
	AgentBackgroundTaskDto,
	AgentBackgroundTasksResponse,
	PushMessage,
} from '@n8n/api-types';
import { flushPromises } from '@vue/test-utils';
import { effectScope, reactive, ref, type EffectScope } from 'vue';

import { useAgentBackgroundTasks } from '../composables/useAgentBackgroundTasks';
import { getAgentBackgroundTasks } from '../composables/useAgentApi';

vi.mock('../composables/useAgentApi', () => ({ getAgentBackgroundTasks: vi.fn() }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('@/app/stores/pushConnection.store', () => ({ usePushConnectionStore: () => pushStore }));
vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal()),
	useDocumentVisibility: () => visibility,
}));

const visibility = ref('visible');
const pushStore = reactive({
	isConnected: true,
	pushConnect: vi.fn(),
	pushDisconnect: vi.fn(),
	addEventListener: vi.fn((listener: (event: PushMessage) => void) => {
		onEvent = listener;
		return removeListener;
	}),
});
const removeListener = vi.fn();
let onEvent: (event: PushMessage) => void;
const task: AgentBackgroundTaskDto = {
	id: 'job-1',
	kind: 'subagent',
	title: 'Check escalations',
	status: 'running',
	startedAt: '2026-09-09T10:00:00.000Z',
};
const update: PushMessage = {
	type: 'agentBackgroundTasksUpdated',
	data: { projectId: 'p1', agentId: 'a1', threadId: 't1' },
};

describe('useAgentBackgroundTasks', () => {
	let scope: EffectScope;
	const threadId = ref('t1');
	const active = ref(true);
	function create() {
		scope = effectScope();
		const result = scope.run(() =>
			useAgentBackgroundTasks({ projectId: 'p1', agentId: 'a1', threadId, active }),
		);
		if (!result) throw new Error('Missing scope');
		return result;
	}
	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetAllMocks();
		threadId.value = 't1';
		active.value = true;
		visibility.value = 'visible';
		pushStore.isConnected = true;
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [task] });
	});
	afterEach(() => {
		scope?.stop();
		vi.useRealTimers();
	});

	it('subscribes before fetching and refreshes only on matching notifications', async () => {
		const { tasks } = create();
		await flushPromises();
		expect(pushStore.addEventListener.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(getAgentBackgroundTasks).mock.invocationCallOrder[0],
		);
		expect(tasks.value).toEqual([task]);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(getAgentBackgroundTasks).toHaveBeenCalledOnce();
		onEvent({ ...update, data: { ...update.data, threadId: 'unrelated' } });
		onEvent({ ...update, data: { ...update.data, agentId: 'unrelated' } });
		onEvent({ ...update, data: { ...update.data, projectId: 'unrelated' } });
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledOnce();
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [] });
		onEvent(update);
		onEvent(update);
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledTimes(2);
		expect(tasks.value).toEqual([]);
	});

	it('queues one refresh for notifications during an active request', async () => {
		let resolveRequest!: (value: AgentBackgroundTasksResponse) => void;
		vi.mocked(getAgentBackgroundTasks).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve;
			}),
		);
		const { tasks } = create();
		await flushPromises();
		onEvent(update);
		onEvent(update);
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledOnce();
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [] });
		resolveRequest({ tasks: [task] });
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledTimes(2);
		expect(tasks.value).toEqual([]);
	});

	it('keeps terminal jobs in the current group until the server clears the group', async () => {
		const completedTask: AgentBackgroundTaskDto = { ...task, status: 'completed' };
		const runningTask: AgentBackgroundTaskDto = {
			...task,
			id: 'job-2',
			startedAt: '2026-09-09T10:01:00.000Z',
		};
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [runningTask, completedTask] });
		const { tasks } = create();
		await flushPromises();
		expect(tasks.value).toEqual([completedTask, runningTask]);
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [] });
		onEvent(update);
		await flushPromises();
		expect(tasks.value).toEqual([]);
	});

	it('fetches a new session without waiting for the previous request and ignores its late response', async () => {
		let resolveRequest!: (value: AgentBackgroundTasksResponse) => void;
		vi.mocked(getAgentBackgroundTasks).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve;
			}),
		);
		const { tasks } = create();
		await flushPromises();
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [] });
		threadId.value = 't2';
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenLastCalledWith({}, 'p1', 'a1', 't2');
		resolveRequest({ tasks: [task] });
		await flushPromises();
		expect(tasks.value).toEqual([]);
	});

	it('refreshes on reopen, document visibility, and connection recovery', async () => {
		active.value = false;
		create();
		await flushPromises();
		expect(getAgentBackgroundTasks).not.toHaveBeenCalled();
		active.value = true;
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledOnce();
		visibility.value = 'hidden';
		await flushPromises();
		onEvent(update);
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledOnce();
		visibility.value = 'visible';
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledTimes(2);
		pushStore.isConnected = false;
		await flushPromises();
		pushStore.isConnected = true;
		await flushPromises();
		expect(getAgentBackgroundTasks).toHaveBeenCalledTimes(3);
		expect(pushStore.pushConnect).not.toHaveBeenCalled();
	});

	it('keeps the last tasks during bounded retries and recovers on a later notification', async () => {
		const { tasks } = create();
		await flushPromises();
		vi.mocked(getAgentBackgroundTasks).mockRejectedValue(new Error('network error'));
		onEvent(update);
		await flushPromises();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(getAgentBackgroundTasks).toHaveBeenCalledTimes(4);
		expect(tasks.value).toEqual([task]);
		vi.mocked(getAgentBackgroundTasks).mockResolvedValue({ tasks: [] });
		onEvent(update);
		await flushPromises();
		expect(tasks.value).toEqual([]);
	});

	it('cleans up listeners and retries without disconnecting the shared connection', async () => {
		vi.mocked(getAgentBackgroundTasks).mockRejectedValue(new Error('network error'));
		create();
		await flushPromises();
		scope.stop();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(removeListener).toHaveBeenCalledOnce();
		expect(pushStore.pushConnect).not.toHaveBeenCalled();
		expect(pushStore.pushDisconnect).not.toHaveBeenCalled();
		expect(getAgentBackgroundTasks).toHaveBeenCalledOnce();
	});
});
