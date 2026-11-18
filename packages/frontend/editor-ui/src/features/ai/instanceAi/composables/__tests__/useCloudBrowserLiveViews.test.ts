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
	windowId: 'window-1',
};

// A popup the site opened in the same session.
const popup: InstanceAiCloudBrowserLiveViewResponse = {
	status: 'live',
	liveViewUrl: 'https://live.example.com/popup',
	windowId: 'window-2',
};

function makeTask(overrides: Partial<CloudBrowserTask> = {}): CloudBrowserTask {
	return {
		agentId: 'agent-1',
		taskId: 'task-1',
		title: 'Find the price',
		state: 'running',
		sessionKey: 'tc-1:0',
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

		tasks.value = [makeTask({ sessionKey: 'tc-1:0' })];
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
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValueOnce(live).mockResolvedValue({
			status: 'live',
			liveViewUrl: 'https://live.example.com/2',
			windowId: 'window-1',
		});

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1:0' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-2:0' })];
		await flushPromises();

		expect(views.get('task-1')).toEqual({
			status: 'live',
			liveViewUrl: 'https://live.example.com/2',
			windowId: 'window-1',
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

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1:0' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-2:0' })];
		await flushPromises();

		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
		expect(views.get('task-1')).toEqual(live);

		resolveSecond({
			status: 'live',
			liveViewUrl: 'https://live.example.com/2',
			windowId: 'window-1',
		});
		await flushPromises();
		expect(views.get('task-1')).toEqual({
			status: 'live',
			liveViewUrl: 'https://live.example.com/2',
			windowId: 'window-1',
		});
	});

	it('fetches the live view again when the window changes, and keeps the window behind loaded', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValueOnce(live).mockResolvedValue(popup);

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1:0' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-1:1' })];
		await flushPromises();

		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
		expect(views.get('task-1')).toEqual({
			...popup,
			background: { windowId: 'window-1', liveViewUrl: 'https://live.example.com/1' },
		});
	});

	it('keeps the link of the window when the window did not change', async () => {
		vi.mocked(fetchCloudBrowserLiveView)
			.mockResolvedValueOnce(live)
			.mockResolvedValue({ ...live, liveViewUrl: 'https://live.example.com/new-link' });

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1:0' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-1:1' })];
		await flushPromises();

		expect(views.get('task-1')).toEqual(live);
	});

	it('uses the loaded link of the window behind when it is current again', async () => {
		vi.mocked(fetchCloudBrowserLiveView)
			.mockResolvedValueOnce(live)
			.mockResolvedValueOnce(popup)
			.mockResolvedValue({ ...live, liveViewUrl: 'https://live.example.com/new-link' });

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1:0' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-1:1' })];
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-1:2' })];
		await flushPromises();

		expect(views.get('task-1')).toEqual(live);
	});

	it('does not keep the window behind when the agent opens a new session', async () => {
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValueOnce(live).mockResolvedValue(popup);

		const { tasks, views } = setup([makeTask({ sessionKey: 'tc-1:0' })]);
		await flushPromises();
		tasks.value = [makeTask({ sessionKey: 'tc-2:0' })];
		await flushPromises();

		expect(views.get('task-1')).toEqual(popup);
	});

	it('ignores the answer for an old session that arrives after the answer for the new one', async () => {
		let resolveFirst!: (view: InstanceAiCloudBrowserLiveViewResponse) => void;
		const second = { ...popup, liveViewUrl: 'https://live.example.com/2' };
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

describe('useCloudBrowserLiveViews disconnect messages', () => {
	// Scopes of the tests above stay alive and listen too, so use a task id only this block uses.
	const taskId = 'task-messages';
	let frames: HTMLIFrameElement[] = [];

	function addFrame(
		frameTaskId: string,
		{ src = 'https://live.example.com/1', windowId = 'window-1' } = {},
	): HTMLIFrameElement {
		const frame = document.createElement('iframe');
		frame.src = src;
		frame.setAttribute('data-cloud-browser-task-id', frameTaskId);
		frame.setAttribute('data-cloud-browser-window-id', windowId);
		document.body.appendChild(frame);
		frames.push(frame);
		return frame;
	}

	function postMessage(
		frame: HTMLIFrameElement | undefined,
		{ data = 'browserbase-disconnected', origin = 'https://live.example.com' } = {},
	) {
		window.dispatchEvent(
			new MessageEvent('message', {
				data,
				origin,
				source: frame?.contentWindow ?? null,
			}),
		);
	}

	beforeEach(() => {
		vi.mocked(fetchCloudBrowserLiveView).mockReset();
		vi.mocked(fetchCloudBrowserLiveView).mockResolvedValue(live);
	});

	afterEach(() => {
		for (const frame of frames) frame.remove();
		frames = [];
	});

	it('fetches the live view again when its own frame disconnects', async () => {
		const { views, scope } = setup([makeTask({ taskId })]);
		await flushPromises();
		const frame = addFrame(taskId);

		postMessage(frame);
		expect(views.get(taskId)).toEqual({ status: 'loading' });
		await flushPromises();

		expect(views.get(taskId)).toEqual(live);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
		scope.stop();
	});

	// Shows the popup in front of the first window.
	async function setupWithPopup() {
		vi.mocked(fetchCloudBrowserLiveView)
			.mockReset()
			.mockResolvedValueOnce(live)
			.mockResolvedValueOnce(popup)
			.mockResolvedValue(live);
		const rendered = setup([makeTask({ taskId, sessionKey: 'tc-1:0' })]);
		await flushPromises();
		rendered.tasks.value = [makeTask({ taskId, sessionKey: 'tc-1:1' })];
		await flushPromises();
		return rendered;
	}

	const popupFrame = { src: 'https://live.example.com/popup', windowId: 'window-2' };

	it('shows the window behind at once when the popup frame disconnects', async () => {
		const { views, scope } = await setupWithPopup();
		const frame = addFrame(taskId, popupFrame);

		postMessage(frame);
		// No "Opening the browser…" or disconnect screen in between.
		expect(views.get(taskId)).toEqual(live);
		await flushPromises();

		expect(views.get(taskId)).toEqual(live);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(3);
		scope.stop();
	});

	it('ignores a second frame of the closed popup, such as the card thumbnail', async () => {
		const { views, scope } = await setupWithPopup();
		const previewFrame = addFrame(taskId, popupFrame);
		const thumbnailFrame = addFrame(taskId, popupFrame);

		postMessage(previewFrame);
		await flushPromises();
		postMessage(thumbnailFrame);
		expect(views.get(taskId)).toEqual(live);
		await flushPromises();

		expect(views.get(taskId)).toEqual(live);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(3);
		scope.stop();
	});

	it('stops keeping the window behind when its frame disconnects', async () => {
		const { views, scope } = await setupWithPopup();
		const frame = addFrame(taskId);

		postMessage(frame);
		await flushPromises();

		expect(views.get(taskId)).toEqual(popup);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(2);
		scope.stop();
	});

	it.each([
		['from another origin', { origin: 'https://other.example.com' }, taskId, true],
		['with other data', { data: 'something-else' }, taskId, true],
		['from a frame of an unknown task', {}, 'task-2', true],
		['from an unknown source', {}, taskId, false],
	])('ignores a message %s', async (_, message, frameTaskId, fromFrame) => {
		const { views, scope } = setup([makeTask({ taskId })]);
		await flushPromises();
		const frame = addFrame(frameTaskId);

		postMessage(fromFrame ? frame : undefined, message);
		await flushPromises();

		expect(views.get(taskId)).toEqual(live);
		expect(fetchCloudBrowserLiveView).toHaveBeenCalledTimes(1);
		scope.stop();
	});
});

describe('embeddedLiveViewUrl', () => {
	it("hides Browserbase's own navigation bar", () => {
		expect(embeddedLiveViewUrl('https://live.example.com/view?t=abc')).toBe(
			'https://live.example.com/view?t=abc&navbar=false',
		);
	});

	it("keeps Browserbase's own navigation bar when asked", () => {
		expect(
			embeddedLiveViewUrl('https://live.example.com/view?t=abc&navbar=false', { navbar: true }),
		).toBe('https://live.example.com/view?t=abc');
	});

	it('leaves a link it cannot read as it is', () => {
		expect(embeddedLiveViewUrl('not a url')).toBe('not a url');
	});
});
