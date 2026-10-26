import type { AgentPlanSnapshotDto, PushMessage } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { flushPromises } from '@vue/test-utils';
import { effectScope, reactive, ref, type EffectScope } from 'vue';
import { useAgentPlan } from '../composables/useAgentPlan';
import { getAgentPlan } from '../composables/useAgentApi';
import { planSnapshot, planTask, planView } from './fixtures/agent-plan';

vi.mock('../composables/useAgentApi', () => ({ getAgentPlan: vi.fn() }));
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
const event: PushMessage = {
	type: 'agentBackgroundTasksUpdated',
	data: { projectId: 'project', agentId: 'agent', threadId: 'thread' },
};
const thread = ref<string | undefined>('thread');
let scope: EffectScope;
function create() {
	scope = effectScope();
	return scope.run(() =>
		useAgentPlan({
			projectId: () => 'project',
			agentId: () => 'agent',
			threadId: () => thread.value,
			active: () => true,
		}),
	)!;
}
beforeEach(() => {
	vi.resetAllMocks();
	thread.value = 'thread';
	push.isConnected = true;
	vi.mocked(getAgentPlan).mockResolvedValue(null);
});
afterEach(() => scope.stop());
it('loads the current plan and accepts job updates at the same revision', async () => {
	const running = planSnapshot(
		planView({ document: { title: 'Plan', items: [planTask(1, 'in_progress')] } }),
	);
	vi.mocked(getAgentPlan).mockResolvedValue(running);
	const state = create();
	await flushPromises();
	expect(state.plan.value).toEqual(running);
	const done = {
		...running,
		document: {
			...running.document,
			items: [{ ...running.document.items[0], status: 'done' as const }],
		},
	};
	vi.mocked(getAgentPlan).mockResolvedValue(done);
	onEvent(event);
	await flushPromises();
	expect(state.plan.value).toEqual(done);
});
it('discards responses superseded by a newer request', async () => {
	const old = createDeferredPromise<AgentPlanSnapshotDto | null>();
	vi.mocked(getAgentPlan).mockReturnValueOnce(old.promise);
	const state = create();
	const current = planSnapshot(planView({ revision: 2 }));
	vi.mocked(getAgentPlan).mockResolvedValue(current);
	await state.refresh();
	old.resolve(planSnapshot(planView()));
	await flushPromises();
	expect(state.plan.value).toEqual(current);
});
it('discards an old conversation response after switching threads', async () => {
	const old = createDeferredPromise<AgentPlanSnapshotDto | null>();
	vi.mocked(getAgentPlan).mockReturnValueOnce(old.promise);
	const state = create();
	thread.value = 'new-thread';
	await flushPromises();
	old.resolve(planSnapshot(planView()));
	await flushPromises();
	expect(state.plan.value).toBeNull();
});
it('refreshes after reconnecting', async () => {
	const state = create();
	await flushPromises();
	push.isConnected = false;
	await flushPromises();
	vi.mocked(getAgentPlan).mockResolvedValue(planSnapshot(planView()));
	push.isConnected = true;
	await flushPromises();
	expect(state.plan.value?.planId).toBe(planView().planId);
});
it('uses null as authoritative and permits a new plan in the same conversation', async () => {
	const state = create();
	await flushPromises();
	expect(state.plan.value).toBeNull();
	vi.mocked(getAgentPlan).mockResolvedValue(planSnapshot(planView()));
	await state.refresh();
	expect(state.plan.value).not.toBeNull();
	vi.mocked(getAgentPlan).mockResolvedValue(null);
	onEvent(event);
	await flushPromises();
	expect(state.plan.value).toBeNull();
});
it('ignores updates for a different conversation', async () => {
	create();
	await flushPromises();
	vi.mocked(getAgentPlan).mockClear();
	onEvent({ ...event, data: { ...event.data, threadId: 'other' } });
	expect(getAgentPlan).not.toHaveBeenCalled();
});
it('does not apply an outstanding response after disposal', async () => {
	const read = createDeferredPromise<AgentPlanSnapshotDto | null>();
	vi.mocked(getAgentPlan).mockReturnValue(read.promise);
	const state = create();
	scope.stop();
	read.resolve(planSnapshot(planView()));
	await flushPromises();
	expect(state.plan.value).toBeNull();
});

it('rejects a lower edit revision from a later read', async () => {
	vi.mocked(getAgentPlan).mockResolvedValue(planSnapshot(planView({ revision: 3 })));
	const state = create();
	await flushPromises();
	vi.mocked(getAgentPlan).mockResolvedValue(planSnapshot(planView({ revision: 2 })));
	await state.refresh();
	expect(state.plan.value?.revision).toBe(3);
});
