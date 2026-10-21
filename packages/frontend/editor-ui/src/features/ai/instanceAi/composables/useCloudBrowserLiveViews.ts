import { useRootStore } from '@n8n/stores/useRootStore';
import { onScopeDispose, reactive, watch, type ComputedRef, type InjectionKey } from 'vue';

import {
	CLOUD_BROWSER_LIVE_VIEW_RETRY_INTERVAL,
	CLOUD_BROWSER_PAGE_POLL_INTERVAL,
} from '@/app/constants/durations';

import { fetchCloudBrowserLiveView, fetchCloudBrowserPage } from '../instanceAi.api';
import type { CloudBrowserTask } from './useCloudBrowserTasks';

export interface CloudBrowserLiveView {
	status: 'loading' | 'starting' | 'live' | 'ended';
	/**
	 * Lets anyone who has it watch and control the browser. Kept in memory only, never stored or
	 * logged.
	 */
	liveViewUrl?: string;
	/** The page the browser is on, for the address bar. */
	pageUrl?: string;
}

export type CloudBrowserLiveViews = ReadonlyMap<string, CloudBrowserLiveView>;

export const CloudBrowserLiveViewsKey: InjectionKey<CloudBrowserLiveViews> =
	Symbol('CloudBrowserLiveViews');

/**
 * A live view link without its signing token. Browserbase signs each link again on every call,
 * so two links to the same tab differ only by the token. Comparing without it keeps the frame
 * from reloading.
 */
export function liveViewKey(href: string): string {
	return href.replace(/([?&])t=[^&]*&?/, '$1').replace(/[?&]$/, '');
}

/** The live view for embedding: without Browserbase's own navigation bar, since the tab draws one. */
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
 * The live view of each running cloud browser task, by task id. Fetched once per task, again
 * after each browser step that can change the tab or page, and every few seconds while the
 * browser is still opening. The page URL is polled cheaply in between: it keeps the address bar
 * current, also while the user has control, and a new URL fetches the live view again in case
 * the tab changed. Create it once per thread view and provide it.
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
			const response = await fetchCloudBrowserLiveView(
				rootStore.restApiContext,
				threadId(),
				taskId,
			);
			next =
				response.status === 'live'
					? { status: 'live', liveViewUrl: response.liveViewUrl, pageUrl: response.pageUrl }
					: { status: response.status };
		} catch {
			// A failed request is retried like a browser that is still opening.
			next = { status: 'starting' };
		}
		// The task ended while the request ran.
		if (!fetchedKeys.has(taskId)) return;

		const current = views.get(taskId);
		const sameFrame =
			next.liveViewUrl &&
			current?.liveViewUrl &&
			liveViewKey(next.liveViewUrl) === liveViewKey(current.liveViewUrl);
		views.set(taskId, sameFrame ? { ...next, liveViewUrl: current.liveViewUrl } : next);

		if (next.status === 'starting') {
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
				if (fetchedKeys.get(task.taskId) === task.liveViewKey) continue;
				fetchedKeys.set(task.taskId, task.liveViewKey);
				if (!views.has(task.taskId)) views.set(task.taskId, { status: 'loading' });
				void refresh(task.taskId);
			}
		},
		{ immediate: true },
	);

	async function pollPage(taskId: string) {
		let pageUrl: string | undefined;
		try {
			({ pageUrl } = await fetchCloudBrowserPage(rootStore.restApiContext, threadId(), taskId));
		} catch {
			return;
		}
		const current = views.get(taskId);
		if (!pageUrl || current?.status !== 'live' || current.pageUrl === pageUrl) return;
		views.set(taskId, { ...current, pageUrl });
		void refresh(taskId);
	}

	const pagePollTimer = setInterval(() => {
		for (const [taskId, view] of views) {
			if (view.status === 'live') void pollPage(taskId);
		}
	}, CLOUD_BROWSER_PAGE_POLL_INTERVAL);

	onScopeDispose(() => {
		clearInterval(pagePollTimer);
		for (const taskId of [...retryTimers.keys()]) clearRetry(taskId);
	});

	return views;
}
