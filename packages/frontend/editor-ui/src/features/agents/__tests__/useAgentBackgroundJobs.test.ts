import type {
	AgentBackgroundJobDto,
	AgentBackgroundJobSignal,
	AgentBackgroundJobsResponse,
	PushMessage,
} from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { flushPromises } from '@vue/test-utils';
import { effectScope, reactive, ref, type EffectScope } from 'vue';

import { useAgentBackgroundJobs } from '../composables/useAgentBackgroundJobs';
import { getAgentBackgroundJobs, resumeAgentBackgroundJob } from '../composables/useAgentApi';

vi.mock('../composables/useAgentApi', () => ({
	getAgentBackgroundJobs: vi.fn(),
	resumeAgentBackgroundJob: vi.fn(),
}));
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
const job: AgentBackgroundJobDto = {
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

describe('useAgentBackgroundJobs', () => {
	let scope: EffectScope;
	const threadId = ref('t1');
	const active = ref(true);
	const receivedJobs = ref<AgentBackgroundJobSignal['tasks']>([]);
	function create() {
		scope = effectScope();
		const result = scope.run(() =>
			useAgentBackgroundJobs({ projectId: 'p1', agentId: 'a1', threadId, active, receivedJobs }),
		);
		if (!result) throw new Error('Missing scope');
		return result;
	}
	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetAllMocks();
		threadId.value = 't1';
		active.value = true;
		receivedJobs.value = [];
		visibility.value = 'visible';
		pushStore.isConnected = true;
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [job] });
	});
	afterEach(() => {
		scope?.stop();
		vi.useRealTimers();
	});

	it('subscribes before fetching and refreshes only on matching notifications', async () => {
		const { jobs } = create();
		await flushPromises();
		expect(pushStore.addEventListener.mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(getAgentBackgroundJobs).mock.invocationCallOrder[0],
		);
		expect(jobs.value).toEqual([job]);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(getAgentBackgroundJobs).toHaveBeenCalledOnce();
		onEvent({ ...update, data: { ...update.data, threadId: 'unrelated' } });
		onEvent({ ...update, data: { ...update.data, agentId: 'unrelated' } });
		onEvent({ ...update, data: { ...update.data, projectId: 'unrelated' } });
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledOnce();
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		onEvent(update);
		onEvent(update);
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledTimes(2);
		expect(jobs.value).toEqual([]);
	});

	it('queues one refresh for notifications during an active request', async () => {
		let resolveRequest!: (value: AgentBackgroundJobsResponse) => void;
		vi.mocked(getAgentBackgroundJobs).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve;
			}),
		);
		const { jobs } = create();
		await flushPromises();
		onEvent(update);
		onEvent(update);
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledOnce();
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		resolveRequest({ tasks: [job] });
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledTimes(2);
		expect(jobs.value).toEqual([]);
	});

	it('keeps terminal jobs in the current group until the server clears the group', async () => {
		const completedJob: AgentBackgroundJobDto = { ...job, status: 'completed' };
		const runningJob: AgentBackgroundJobDto = {
			...job,
			id: 'job-2',
			startedAt: '2026-09-09T10:01:00.000Z',
		};
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [runningJob, completedJob] });
		const { jobs } = create();
		await flushPromises();
		expect(jobs.value).toEqual([completedJob, runningJob]);
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		onEvent(update);
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('loads a waiting approval and preserves a new gate when the previous response finishes', async () => {
		const approval = { runId: 'background-job-job-1', toolCallId: 'gate-1' };
		const waiting: AgentBackgroundJobDto = { ...job, status: 'suspended', approval };
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [waiting] });
		const { jobs, respondToApproval } = create();
		await flushPromises();
		expect(jobs.value).toEqual([waiting]);
		let finishResponse!: () => void;
		vi.mocked(resumeAgentBackgroundJob).mockReturnValueOnce(
			new Promise((resolve) => {
				finishResponse = resolve;
			}),
		);
		const payload = { ...approval, resumeData: { approved: true } };
		const response = respondToApproval(payload);
		const next = { ...waiting, approval: { ...approval, toolCallId: 'gate-2' } };
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [next] });
		onEvent(update);
		await flushPromises();
		const refresh = createDeferredPromise<AgentBackgroundJobsResponse>();
		vi.mocked(getAgentBackgroundJobs).mockReturnValueOnce(refresh.promise);
		finishResponse();
		await response;
		expect(resumeAgentBackgroundJob).toHaveBeenCalledWith({}, 'p1', 'a1', 't1', payload);
		expect(jobs.value[0].approval?.toolCallId).toBe('gate-2');
		refresh.resolve({ tasks: [next] });
		await flushPromises();
	});

	it('refreshes an expired approval after a late response fails', async () => {
		const approval = { runId: 'background-job-job-1', toolCallId: 'gate-1' };
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({
			tasks: [{ ...job, status: 'suspended', approval }],
		});
		const { jobs, respondToApproval } = create();
		await flushPromises();
		vi.mocked(resumeAgentBackgroundJob).mockRejectedValueOnce(new Error('Approval expired'));
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		await expect(
			respondToApproval({ ...approval, resumeData: { approved: false } }),
		).rejects.toThrow('Approval expired');
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('keeps final statuses until all pending task signals reach the chat', async () => {
		const { jobs } = create();
		await flushPromises();
		const completed = { ...job, status: 'completed' as const };
		const failed = { ...job, id: 'job-2', status: 'failed' as const };
		const cancelled = { ...job, id: 'job-3', status: 'cancelled' as const };
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({
			tasks: [completed, failed, cancelled],
			pendingTaskIds: [completed.id, failed.id],
		});
		onEvent(update);
		await flushPromises();
		expect(jobs.value).toEqual([completed, failed, cancelled]);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(jobs.value).toEqual([completed, failed, cancelled]);
		expect(getAgentBackgroundJobs).toHaveBeenCalledTimes(2);
		receivedJobs.value = [completed];
		expect(jobs.value).toHaveLength(3);
		receivedJobs.value = [completed, failed];
		expect(jobs.value).toEqual([]);
		onEvent(update);
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('does not restore a running card from a late response after its signal arrives', async () => {
		let resolveRequest!: (value: AgentBackgroundJobsResponse) => void;
		vi.mocked(getAgentBackgroundJobs).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve;
			}),
		);
		const { jobs } = create();
		await flushPromises();
		receivedJobs.value = [{ ...job, status: 'completed' }];
		resolveRequest({ tasks: [job] });
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('clears results consumed without a signal and clears pending tasks on a session change', async () => {
		const terminal = { ...job, status: 'cancelled' as const };
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({
			tasks: [terminal],
			pendingTaskIds: [job.id],
		});
		const { jobs } = create();
		await flushPromises();
		expect(jobs.value).toEqual([terminal]);
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [], pendingTaskIds: [] });
		onEvent(update);
		await flushPromises();
		expect(jobs.value).toEqual([]);
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({
			tasks: [terminal],
			pendingTaskIds: [job.id],
		});
		onEvent(update);
		await flushPromises();
		expect(jobs.value).toEqual([terminal]);
		threadId.value = 't2';
		expect(jobs.value).toEqual([]);
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('fetches a new session without waiting for the previous request and ignores its late response', async () => {
		let resolveRequest!: (value: AgentBackgroundJobsResponse) => void;
		vi.mocked(getAgentBackgroundJobs).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveRequest = resolve;
			}),
		);
		const { jobs } = create();
		await flushPromises();
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		threadId.value = 't2';
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenLastCalledWith({}, 'p1', 'a1', 't2');
		resolveRequest({ tasks: [job] });
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('refreshes on reopen, document visibility, and connection recovery', async () => {
		active.value = false;
		create();
		await flushPromises();
		expect(getAgentBackgroundJobs).not.toHaveBeenCalled();
		active.value = true;
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledOnce();
		visibility.value = 'hidden';
		await flushPromises();
		onEvent(update);
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledOnce();
		visibility.value = 'visible';
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledTimes(2);
		pushStore.isConnected = false;
		await flushPromises();
		pushStore.isConnected = true;
		await flushPromises();
		expect(getAgentBackgroundJobs).toHaveBeenCalledTimes(3);
		expect(pushStore.pushConnect).not.toHaveBeenCalled();
	});

	it('keeps the last tasks during bounded retries and recovers on a later notification', async () => {
		const { jobs } = create();
		await flushPromises();
		vi.mocked(getAgentBackgroundJobs).mockRejectedValue(new Error('network error'));
		onEvent(update);
		await flushPromises();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(getAgentBackgroundJobs).toHaveBeenCalledTimes(4);
		expect(jobs.value).toEqual([job]);
		vi.mocked(getAgentBackgroundJobs).mockResolvedValue({ tasks: [] });
		onEvent(update);
		await flushPromises();
		expect(jobs.value).toEqual([]);
	});

	it('cleans up listeners and retries without disconnecting the shared connection', async () => {
		vi.mocked(getAgentBackgroundJobs).mockRejectedValue(new Error('network error'));
		create();
		await flushPromises();
		scope.stop();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(removeListener).toHaveBeenCalledOnce();
		expect(pushStore.pushConnect).not.toHaveBeenCalled();
		expect(pushStore.pushDisconnect).not.toHaveBeenCalled();
		expect(getAgentBackgroundJobs).toHaveBeenCalledOnce();
	});
});
