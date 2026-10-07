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
	id: 'cancellation',
	planId: null,
	status: 'stopped',
	requestedAt: '2026-10-01T10:00:00.000Z',
	settledAt: '2026-10-01T10:01:00.000Z',
	failures: [],
	reportStatus: 'reported',
	report: '',
	plan: null,
	heldQueueIds: ['1'],
};
const event: PushMessage = {
	type: 'agentBackgroundTasksUpdated',
	data: { projectId: 'project', agentId: 'agent', threadId: 'thread' },
};
let scope: EffectScope;
const thread = ref('thread');
function create() {
	scope = effectScope();
	return scope.run(() =>
		useAgentTaskCancellation({
			projectId: () => 'project',
			agentId: () => 'agent',
			threadId: () => thread.value,
			active: () => true,
			planId: () => null,
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

it('disables repeated clicks and reuses the failed cancellation identity on retry', async () => {
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
		cancellationId: 'cancellation',
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
	expect(state.state.value?.heldQueueIds).toEqual(['1']);
	vi.mocked(getAgentTaskCancellation).mockResolvedValue({ ...stopped, heldQueueIds: [] });
	onEvent(event);
	await flushPromises();
	expect(state.state.value?.heldQueueIds).toEqual([]);
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
