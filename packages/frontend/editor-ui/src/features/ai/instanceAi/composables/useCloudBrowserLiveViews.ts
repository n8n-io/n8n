import type { InstanceAiCloudBrowserLiveViewResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useEventListener } from '@vueuse/core';
import { onScopeDispose, reactive, watch, type ComputedRef, type InjectionKey } from 'vue';

import { CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL } from '@/app/constants/durations';

import { fetchCloudBrowserLiveView } from '../instanceAi.api';
import type { CloudBrowserTask } from './useCloudBrowserTasks';

/**
 * The server's answer, or `loading` before the first one. The `live` link lets anyone who has it
 * watch and control the browser, so it is kept in memory only, never stored or logged.
 */
export type CloudBrowserLiveView = InstanceAiCloudBrowserLiveViewResponse | { status: 'loading' };

export type CloudBrowserLiveViews = ReadonlyMap<string, CloudBrowserLiveView>;

export const CloudBrowserLiveViewsKey: InjectionKey<CloudBrowserLiveViews> =
	Symbol('CloudBrowserLiveViews');

/** Set on every live view iframe, with the task id, so a message from the frame leads to its task. */
const FRAME_TASK_ATTRIBUTE = 'data-cloud-browser-task-id';

/** What Browserbase's live view posts to its parent when its session ends or its connection drops. */
const DISCONNECTED_MESSAGE = 'browserbase-disconnected';

/** The task whose live view iframe sent the message, if it came from one of them. */
function taskIdOfMessage(event: MessageEvent): string | undefined {
	for (const frame of document.querySelectorAll<HTMLIFrameElement>(
		`iframe[${FRAME_TASK_ATTRIBUTE}]`,
	)) {
		if (frame.contentWindow !== event.source) continue;
		if (new URL(frame.src).origin !== event.origin) return undefined;
		return frame.getAttribute(FRAME_TASK_ATTRIBUTE) ?? undefined;
	}
	return undefined;
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

	async function refresh(taskId: string) {
		clearRetry(taskId);
		let next: CloudBrowserLiveView;
		try {
			next = await fetchCloudBrowserLiveView(rootStore.restApiContext, threadId(), taskId);
		} catch {
			// A failed request is retried like a browser that is still opening.
			next = { status: 'starting' };
		}
		// The task ended while the request ran.
		if (!fetchedKeys.has(taskId)) return;

		views.set(taskId, next);

		// Until the browser is live, ask again. A task that is not found has ended.
		if (next.status !== 'live' && next.status !== 'not-found') {
			retryTimers.set(
				taskId,
				setTimeout(() => void refresh(taskId), CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL),
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
				if (fetchedKeys.get(task.taskId) === task.sessionKey) continue;
				fetchedKeys.set(task.taskId, task.sessionKey);
				if (!views.has(task.taskId)) views.set(task.taskId, { status: 'loading' });
				void refresh(task.taskId);
			}
		},
		{ immediate: true },
	);

	// A live view that disconnects shows Chrome's own disconnect message. Remove its frames at once and
	// ask the server what happened: the browser closed, a new session is opening, or the task ended.
	useEventListener(window, 'message', (event: MessageEvent) => {
		if (event.data !== DISCONNECTED_MESSAGE) return;
		const taskId = taskIdOfMessage(event);
		if (!taskId || !fetchedKeys.has(taskId)) return;
		views.set(taskId, { status: 'loading' });
		void refresh(taskId);
	});

	onScopeDispose(() => {
		for (const taskId of [...retryTimers.keys()]) clearRetry(taskId);
	});

	return views;
}
