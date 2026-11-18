import type { InstanceAiCloudBrowserLiveViewResponse } from '@n8n/api-types';
import { flushPromises } from '@vue/test-utils';
import { computed, effectScope, ref } from 'vue';

import { CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL } from '@/app/constants/durations';

import { fetchCloudBrowserLiveView } from '../../instanceAi.api';
import { embeddedLiveViewUrl, useCloudBrowserLiveViews } from '../useCloudBrowserLiveViews';
import type { CloudBrowserTask } from '../useCloudBrowserTasks';

vi.mock('../../instanceAi.api', () => ({ fetchCloudBrowserLiveView: vi.fn() }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ restApiContext: {} }) }));

const live: InstanceAiCloudBrowserLiveViewResponse = {
	status: 'live',
	liveViewUrl: 'https://live.example.com/1',
};

function makeTask(overrides: Partial<CloudBrowserTask> = {}): CloudBrowserTask {
	return {
		agentId: 'agent-1',
		taskId: 'task-1',
		title: 'Find the price',
		state: 'running',
		sessionKey: 'tc-1',
		...overrides,
	};
}

function setup(initial: CloudBrowserTask[]) {
	const tasks = ref(initial);
	const scope = effectScope();
	const views = scope.run(() =>
		useCloudBrowserLiveViews(
			computed(() => tasks.value),
			() => 'thread-1',
		),
	)!;
	return { tasks, views, scope };
}

describe('useCloudBrowserLiveViews', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.mocked(fetchCloudBrowserLiveView).mockReset();
	});

	afterEach(() => vi.useRealTimers());

	it('fetches the live view of a task once its session opens', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValue(live);

		const { views } = setup([makeTask()]);
		expect(views.get('task-1')).toEqual({ status: 'loading' });
		await flushPromises();

		expect(views.get('task-1')).toEqual(live);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledWith({}, 'thread-1', 'task-1');
	});

	it('does not ask for a task whose session has not opened yet', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValue(live);

		const { tasks, views } = setup([makeTask({ sessionKey: '' })]);
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL);

		expect(fetchCloudBrowserLiveView).not.toHaveBeenCalled();
		expect(views.get('task-1')).toBeUndefined();

		tasks.value = [makeTask({ sessionKey: 'tc-1' })];
		await flushPromises();
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
		expect(views.get('task-1')).toEqual(live);
	});

	it('asks again until the browser is live', async () => {
		vi.mocked(fetchCloudBrowserLiveView)
			.mockResolvedValueOnce({ status: 'starting' })
			.mockResolvedValueOnce({ status: 'no-session' })
			.mockResolvedValue(live);

		const { views } = setup([makeTask()]);
		await flushPromises();
		expect(views.get('task-1')).toEqual({ status: 'starting' });

		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL);
		expect(views.get('task-1')).toEqual({ status: 'no-session' });

		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL);
		expect(views.get('task-1')).toEqual(live);

		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(3);
	});

	it('asks again after a failed request', async () => {
		vi.mocked(fetchCloudBrowserLiveView)
			.mockRejectedValueOnce(new Error('Network error'))
			.mockResolvedValue(live);

		const { views } = setup([makeTask()]);
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL);

		expect(views.get('task-1')).toEqual(live);
	});

	it('stops asking for a task that is not found', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValue({ status: 'not-found' });

		const { views } = setup([makeTask()]);
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);

		expect(views.get('task-1')).toEqual({ status: 'not-found' });
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
	});

	it('fetches the live view again when the agent opens a new session', async () => {
		vi.mocked(fetchCloudBrowserLiveView)
			.mockResolvedValueOnce(live)
			.mockResolvedValue({ status: 'live', liveViewUrl: 'https://live.example.com/2' });

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-2' })];
		await flushPromises();

		expect(views.get('task-1')).toEqual({
			status: 'live',
			liveViewUrl: 'https://live.example.com/2',
		});
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
	});

	it('keeps the old live view while it fetches the link of a new session', async () => {
		let resolveSecond!: (view: InstanceAiCloudBrowserLiveViewResponse) => void;
		vi.mocked(fetchCloudBrowserLiveView)
			.mockResolvedValueOnce(live)
			.mockImplementationOnce(
				async () => await new Promise((resolve) => (resolveSecond = resolve)),
			);

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-2' })];
		await flushPromises();

		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
		expect(views.get('task-1')).toEqual(live);

		resolveSecond({ status: 'live', liveViewUrl: 'https://live.example.com/2' });
		await flushPromises();
		expect(views.get('task-1')).toEqual({
			status: 'live',
			liveViewUrl: 'https://live.example.com/2',
		});
	});

	it('ignores the answer for an old session that arrives after the answer for the new one', async () => {
		let resolveFirst!: (view: InstanceAiCloudBrowserLiveViewResponse) => void;
		const second = { status: 'live' as const, liveViewUrl: 'https://live.example.com/2' };
		vi.mocked(fetchCloudBrowserLiveView)
			.mockImplementationOnce(async () => await new Promise((resolve) => (resolveFirst = resolve)))
			.mockResolvedValue(second);

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1' })]);
		tasks.value = [makeTask({ sessionKey: 'tc-2' })];
		await flushPromises();
		expect(views.get('task-1')).toEqual(second);

		resolveFirst({ status: 'starting' });
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);

		expect(views.get('task-1')).toEqual(second);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
	});

	it('forgets a task that stopped running, and stops asking for it', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValue({ status: 'starting' });

		const { tasks, views } = setup([makeTask()]);
		await flushPromises();
		tasks.value = [];
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);

		expect(views.has('task-1')).toBe(false);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
	});

	it('ignores a response that arrives after the task stopped running', async () => {
		let resolveFetch!: (view: InstanceAiCloudBrowserLiveViewResponse) => void;
		vi.mocked(fetchCloudBrowserLiveView).mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveFetch = resolve)),
		);

		const { tasks, views } = setup([makeTask()]);
		tasks.value = [];
		await flushPromises();
		resolveFetch({ status: 'starting' });
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);

		expect(views.has('task-1')).toBe(false);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
	});

	it('does not ask again for a response that arrives after the thread view went away', async () => {
		let resolveFetch!: (view: InstanceAiCloudBrowserLiveViewResponse) => void;
		vi.mocked(fetchCloudBrowserLiveView).mockImplementationOnce(
			async () => await new Promise((resolve) => (resolveFetch = resolve)),
		);

		const { scope } = setup([makeTask()]);
		scope.stop();
		resolveFetch({ status: 'starting' });
		await flushPromises();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);

		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
	});

	it('stops asking when the thread view goes away', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValue({ status: 'starting' });

		const { scope } = setup([makeTask()]);
		await flushPromises();
		scope.stop();
		await vi.advanceTimersByTimeAsync(CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL * 3);

		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
	});
});

describe('embeddedLiveViewUrl', () => {
	it("hides Browserbase's own navigation bar", () => {
		expect(embeddedLiveViewUrl('https://live.example.com/view?t=abc')).toBe(
			'https://live.example.com/view?t=abc&navbar=false',
		);
	});

	it('leaves a link it cannot read as it is', () => {
		expect(embeddedLiveViewUrl('not a url')).toBe('not a url');
	});
});
