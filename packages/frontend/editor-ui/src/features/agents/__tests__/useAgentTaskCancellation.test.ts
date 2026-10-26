import { planView, planSnapshot } from './fixtures/agent-plan';
import type { AgentTaskCancellationState, PushMessage } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { flushPromises } from '@vue/test-utils';
import { effectScope, reactive, ref, type EffectScope } from 'vue';

import { useAgentTaskCancellation } from '../composables/useAgentTaskCancellation';
import { cancelAgentTasks, getAgentTaskCancellation } from '../composables/useAgentApi';

vi.mock('../composables/useAgentApi', () => ({
	cancelAgentTasks: vi.fn(),
	getAgentTaskCancellation: vi.fn(),
}));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));
vi.mock('@/app/stores/pushConnection.store', () => ({ usePushConnectionStore: () => push }));
const push = reactive({
	isConnected: true,
	addEventListener: (callback: (event: PushMessage) => void) => {
		onEvent = callback;
		return vi.fn();
	},
});
let onEvent: (event: PushMessage) => void;
const stopped: AgentTaskCancellationState = {
	planId: null,
	status: 'stopped',
	requestedAt: '2026-10-01T10:00:00.000Z',
	failures: [],
	plan: null,
};
const event: PushMessage = {
	type: 'agentBackgroundTasksUpdated',
	data: { projectId: 'project', agentId: 'agent', threadId: 'thread' },
};
let scope: EffectScope;
const thread = ref('thread');
function create(requestStop?: (planId: string | null) => Promise<void>) {
	scope = effectScope();
	return scope.run(() =>
		useAgentTaskCancellation({
			projectId: () => 'project',
			agentId: () => 'agent',
			threadId: () => thread.value,
			active: () => true,
			planId: () => null,
			requestStop,
		}),
	)!;
}
beforeEach(() => {
	vi.resetAllMocks();
	thread.value = 'thread';
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(null);
});
afterEach(() => scope.stop());

it('ignores a stale read after a cancellation response', async () => {
	const read = createDeferredPromise<AgentTaskCancellationState | null>();
	vi.mocked(getAgentTaskCancellation).mockReturnValueOnce(read.promise);
	const state = create();
	vi.mocked(cancelAgentTasks).mockResolvedValue(stopped);
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(stopped);
	await state.stopAll();
	read.resolve(null);
	await flushPromises();
	expect(state.state.value).toEqual(stopped);
});

it('disables repeated clicks and sends a fresh Stop without a cancellation identity', async () => {
	const response = createDeferredPromise<AgentTaskCancellationState>();
	const failed: AgentTaskCancellationState = {
		...stopped,
		status: 'failed',
		failures: [{ jobId: 'job', title: 'Workflow' }],
	};
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(failed);
	const state = create();
	await flushPromises();
	vi.mocked(cancelAgentTasks).mockReturnValue(response.promise);
	const pending = state.stopAll();
	await state.stopAll();
	expect(state.isStopping.value).toBe(true);
	expect(cancelAgentTasks).toHaveBeenCalledExactlyOnceWith({}, 'project', 'agent', 'thread', {
		planId: null,
	});
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(stopped);
	response.resolve(stopped);
	await pending;
	expect(state.isStopping.value).toBe(false);
});

it('restores cancellation from server state and refreshes on push', async () => {
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(stopped);
	const state = create();
	await flushPromises();
	expect(state.state.value?.status).toBe('stopped');
	vi.mocked(getAgentTaskCancellation).mockResolvedValue({ ...stopped, status: 'resumed' });
	onEvent(event);
	await flushPromises();
	expect(state.state.value?.status).toBe('resumed');
});

it('does not apply an old cancellation response to another conversation', async () => {
	const response = createDeferredPromise<AgentTaskCancellationState>();
	const state = create();
	await flushPromises();
	vi.mocked(cancelAgentTasks).mockReturnValue(response.promise);
	const pending = state.stopAll();
	thread.value = 'new-thread';
	await flushPromises();
	response.resolve(stopped);
	await pending;
	expect(state.state.value).toBeNull();
	expect(state.isStopping.value).toBe(false);
});

it('rejects a lower plan revision and an older stop from later reads', async () => {
	const plan = planView({ revision: 3 });
	const current = {
		...stopped,
		planId: plan.planId,
		plan: planSnapshot(plan),
	};
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(current);
	const state = create();
	await flushPromises();
	vi.mocked(getAgentTaskCancellation).mockResolvedValue({
		...current,
		plan: { ...current.plan, revision: 2 },
	});
	await state.refresh();
	expect(state.state.value?.plan?.revision).toBe(3);
	vi.mocked(getAgentTaskCancellation).mockResolvedValue({
		...current,
		requestedAt: '2026-09-30T10:00:00.000Z',
	});
	await state.refresh();
	expect(state.state.value?.requestedAt).toBe(current.requestedAt);
});

it('keeps a newer stop pending after leaving and returning to the same conversation', async () => {
	const first = createDeferredPromise<AgentTaskCancellationState>();
	const second = createDeferredPromise<AgentTaskCancellationState>();
	vi.mocked(cancelAgentTasks)
		.mockReturnValueOnce(first.promise)
		.mockReturnValueOnce(second.promise);
	const state = create();
	await flushPromises();
	const oldStop = state.stopAll();
	thread.value = 'other-thread';
	await flushPromises();
	thread.value = 'thread';
	await flushPromises();
	const newStop = state.stopAll();
	const reads = vi.mocked(getAgentTaskCancellation).mock.calls.length;
	first.resolve(stopped);
	await oldStop;
	expect(state.isStopping.value).toBe(true);
	expect(getAgentTaskCancellation).toHaveBeenCalledTimes(reads);
	await state.stopAll();
	expect(cancelAgentTasks).toHaveBeenCalledTimes(2);
	vi.mocked(getAgentTaskCancellation).mockResolvedValue(stopped);
	second.resolve(stopped);
	await newStop;
	expect(state.isStopping.value).toBe(false);
	expect(state.state.value).toEqual(stopped);
});

it('keeps Stop feedback visible until the accepted state arrives', async () => {
	const accepted = createDeferredPromise<void>();
	const read = createDeferredPromise<AgentTaskCancellationState | null>();
	const state = create(() => accepted.promise);
	await flushPromises();
	vi.mocked(getAgentTaskCancellation).mockReturnValueOnce(read.promise);
	const pending = state.stopAll();
	expect(state.isStopping.value).toBe(true);
	accepted.resolve();
	await flushPromises();
	expect(state.isStopping.value).toBe(true);
	read.resolve(stopped);
	await pending;
	expect(state.state.value).toEqual(stopped);
	expect(state.isStopping.value).toBe(false);
	expect(cancelAgentTasks).not.toHaveBeenCalled();
});
