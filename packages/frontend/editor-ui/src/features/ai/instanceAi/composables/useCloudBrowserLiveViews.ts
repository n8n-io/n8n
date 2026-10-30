import type { InstanceAiCloudBrowserLiveViewResponse } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
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

/** The live view for embedding: without Browserbase's own navigation bar. */
export function embeddedLiveViewUrl(href: string): string {
	try {
		const url = new URL(href);
		url.searchParams.set('navbar', 'false');
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

		views.set(taskId, next);

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
				if (fetchedKeys.get(task.taskId) === task.sessionKey) continue;
				fetchedKeys.set(task.taskId, task.sessionKey);
				if (!views.has(task.taskId)) views.set(task.taskId, { status: 'loading' });
				void refresh(task.taskId);
			}
		},
		{ immediate: true },
	);

	onScopeDispose(() => {
		for (const taskId of [...retryTimers.keys()]) clearRetry(taskId);
		// A request that is still running then finds no key and does not ask again.
		fetchedKeys.clear();
	});

	return views;
}
