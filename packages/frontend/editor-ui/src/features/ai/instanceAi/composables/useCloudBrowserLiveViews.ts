import type { InstanceAiCloudBrowserLiveViewResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useEventListener } from '@vueuse/core';
import { onScopeDispose, reactive, watch, type ComputedRef, type InjectionKey } from 'vue';

import { CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL } from '@/app/constants/durations';

import { fetchCloudBrowserLiveView } from '../instanceAi.api';
import type { CloudBrowserTask } from './useCloudBrowserTasks';

type LiveResponse = Extract<InstanceAiCloudBrowserLiveViewResponse, { status: 'live' }>;

/** A window that stays loaded behind the current one, so the view can go back to it at once. */
export interface CloudBrowserBackgroundWindow {
	windowId: string;
	liveViewUrl: string;
}

/**
 * The server's answer, or `loading` before the first one. A `live` view keeps the window that was
 * current before a site opened a new one as `background`, so it shows again at once when the new
 * window closes. Links let anyone who has them watch and control the browser, so they are kept in
 * memory only, never stored or logged.
 */
export type CloudBrowserLiveView =
	| (LiveResponse & { background?: CloudBrowserBackgroundWindow })
	| Exclude<InstanceAiCloudBrowserLiveViewResponse, { status: 'live' }>
	| { status: 'loading' };

export type CloudBrowserLiveViews = ReadonlyMap<string, CloudBrowserLiveView>;

export const CloudBrowserLiveViewsKey: InjectionKey<CloudBrowserLiveViews> =
	Symbol('CloudBrowserLiveViews');

/** Set on every live view iframe, with the task id, so a message from the frame leads to its task. */
const FRAME_TASK_ATTRIBUTE = 'data-cloud-browser-task-id';

/** Set on every live view iframe, with the id of the window it shows. */
const FRAME_WINDOW_ATTRIBUTE = 'data-cloud-browser-window-id';

/** What Browserbase's live view posts to its parent when its session ends or its connection drops. */
const DISCONNECTED_MESSAGE = 'browserbase-disconnected';

/** The task and window whose live view iframe sent the message, if it came from one of them. */
function frameOfMessage(event: MessageEvent): { taskId: string; windowId?: string } | undefined {
	for (const frame of document.querySelectorAll<HTMLIFrameElement>(
		`iframe[${FRAME_TASK_ATTRIBUTE}]`,
	)) {
		if (frame.contentWindow !== event.source) continue;
		if (new URL(frame.src).origin !== event.origin) return undefined;
		const taskId = frame.getAttribute(FRAME_TASK_ATTRIBUTE);
		if (!taskId) return undefined;
		return { taskId, windowId: frame.getAttribute(FRAME_WINDOW_ATTRIBUTE) ?? undefined };
	}
	return undefined;
}

/**
 * The next view of a session the client already shows. The same window keeps its link, so its
 * frame does not reload. A new window keeps the current one loaded behind it. Going back to the
 * window behind uses that loaded frame.
 */
function nextViewInSession(current: CloudBrowserLiveView | undefined, next: CloudBrowserLiveView) {
	if (next.status !== 'live' || current?.status !== 'live') return next;
	if (next.windowId === current.windowId) {
		return { ...next, liveViewUrl: current.liveViewUrl, background: current.background };
	}
	if (next.windowId === current.background?.windowId) {
		return { ...next, liveViewUrl: current.background.liveViewUrl };
	}
	return {
		...next,
		background: { windowId: current.windowId, liveViewUrl: current.liveViewUrl },
	};
}

/** The session part of a task's session key. The rest counts the session's window changes. */
function sessionOfKey(sessionKey: string): string {
	return sessionKey.split(':')[0];
}

/**
 * The live view for embedding. Without `navbar`, Browserbase's own bar (address and
 * navigation buttons) is hidden.
 */
export function embeddedLiveViewUrl(href: string, { navbar = false } = {}): string {
	try {
		const url = new URL(href);
		if (navbar) url.searchParams.delete('navbar');
		else url.searchParams.set('navbar', 'false');
		return url.toString();
	} catch {
		return href;
	}
}

/**
 * The live view of each running cloud browser task, by task id. Fetched when the agent opens a
 * session, every few seconds until the browser is live, and again for each new session, since the
 * link shows the session's tab whatever page it is on. Create it once per thread view and provide
 * it.
 */
export function useCloudBrowserLiveViews(
	tasks: ComputedRef<CloudBrowserTask[]>,
	threadId: () => string,
): CloudBrowserLiveViews {
	const rootStore = useRootStore();
	const views = reactive(new Map<string, CloudBrowserLiveView>());
	const fetchedKeys = new Map<string, string>();
	const retryTimers = new Map<string, ReturnType<typeof setTimeout>>();

	function clearRetry(taskId: string) {
		clearTimeout(retryTimers.get(taskId));
		retryTimers.delete(taskId);
	}

	/** `sameSession` when the task still runs the session the client shows. */
	async function refresh(taskId: string, { sameSession = false } = {}) {
		const sessionKey = fetchedKeys.get(taskId);
		if (!sessionKey) return;
		clearRetry(taskId);
		let next: CloudBrowserLiveView;
		try {
			next = await fetchCloudBrowserLiveView(rootStore.restApiContext, threadId(), taskId);
		} catch {
			// A failed request is retried like a browser that is still opening.
			next = { status: 'starting' };
		}
		// The task ended, or a new session started, while the request ran.
		if (fetchedKeys.get(taskId) !== sessionKey) return;

		views.set(taskId, sameSession ? nextViewInSession(views.get(taskId), next) : next);

		// Until the browser is live, ask again. A task that is not found has ended.
		if (next.status !== 'live' && next.status !== 'not-found') {
			retryTimers.set(
				taskId,
				setTimeout(() => {
					void refresh(taskId);
				}, CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL),
			);
		}
	}

	watch(
		tasks,
		(current) => {
			const running = new Set(current.map((task) => task.taskId));
			for (const taskId of [...fetchedKeys.keys()]) {
				if (running.has(taskId)) continue;
				clearRetry(taskId);
				fetchedKeys.delete(taskId);
				views.delete(taskId);
			}
			for (const task of current) {
				// No session has opened yet, so the task has no live view to fetch.
				if (!task.sessionKey) continue;
				const fetchedKey = fetchedKeys.get(task.taskId);
				if (fetchedKey === task.sessionKey) continue;
				fetchedKeys.set(task.taskId, task.sessionKey);
				if (!views.has(task.taskId)) views.set(task.taskId, { status: 'loading' });
				// Only the window count changed, so the session is the same.
				const sameSession =
					fetchedKey !== undefined && sessionOfKey(fetchedKey) === sessionOfKey(task.sessionKey);
				void refresh(task.taskId, { sameSession });
			}
		},
		{ immediate: true },
	);

	// A live view that disconnects shows Chrome's own disconnect message, so it never stays on screen.
	useEventListener(window, 'message', (event: MessageEvent) => {
		if (event.data !== DISCONNECTED_MESSAGE) return;
		const frame = frameOfMessage(event);
		if (!frame || !fetchedKeys.has(frame.taskId)) return;
		const { taskId, windowId } = frame;
		const view = views.get(taskId);

		if (view?.status === 'live' && windowId !== view.windowId) {
			// The window behind closed, or a frame of a window the view already left disconnected.
			if (windowId === view.background?.windowId)
				views.set(taskId, { ...view, background: undefined });
			return;
		}
		if (view?.status === 'live' && view.background) {
			// The current window closed, for example a sign-in popup. Show the window behind it at
			// once, then ask the server which window is current now.
			views.set(taskId, { ...view, ...view.background, background: undefined });
			void refresh(taskId, { sameSession: true });
			return;
		}
		// Remove the frames at once and ask the server what happened: the browser closed, a new
		// session is opening, or the task ended.
		views.set(taskId, { status: 'loading' });
		void refresh(taskId);
	});

	onScopeDispose(() => {
		for (const taskId of [...retryTimers.keys()]) clearRetry(taskId);
		// A request that is still running then finds no key and does not ask again.
		fetchedKeys.clear();
	});

	return views;
}
