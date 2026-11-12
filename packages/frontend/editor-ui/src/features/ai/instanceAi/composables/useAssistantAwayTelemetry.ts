import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { onBeforeUnmount, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import { trackOnPageHide } from '@/app/plugins/telemetry/trackOnPageHide';

const { INSTANCE_AI } = TELEMETRY_EVENT;

/** Threads the user left mid-run, with the time they left. Outlives the thread view. */
const leftThreadAt = new Map<string, number>();

/**
 * Tracks the user leaving and returning while the Assistant runs: first the
 * thread (another thread or page), then the browser tab (another tab or app,
 * or closing the tab). `visibilitychange` fires before a tab closes, so it
 * covers both tab cases. The telemetry SDK loses requests that start while a
 * tab closes, so "left n8n" goes through `trackOnPageHide`, and the backend
 * emits it.
 */
export function useAssistantAwayTelemetry(options: {
	threadId: () => string;
	isRunning: () => boolean;
}) {
	const telemetry = useTelemetry();
	const router = useRouter();
	const rootStore = useRootStore();
	let tabHiddenAt: number | undefined;
	let wasRunningBeforeUnmount = false;

	onMounted(() => {
		const threadId = options.threadId();
		const leftAt = leftThreadAt.get(threadId);
		if (leftAt !== undefined) {
			leftThreadAt.delete(threadId);
			telemetry.track(INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD, {
				thread_id: threadId,
				time_away_ms: Date.now() - leftAt,
			});
		}
		document.addEventListener('visibilitychange', onVisibilityChange);
	});

	// Vue clears the template refs of child components while it unmounts them,
	// before `onUnmounted` runs, so read the running state here.
	onBeforeUnmount(() => {
		wasRunningBeforeUnmount = options.isRunning();
	});

	onUnmounted(() => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
		const threadId = options.threadId();
		// A discarded duplicate view unmounts while the route still points at the thread.
		if (router.currentRoute.value.params.threadId === threadId) return;
		if (!wasRunningBeforeUnmount) return;
		leftThreadAt.set(threadId, Date.now());
		telemetry.track(INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WHILE_RUNNING, {
			thread_id: threadId,
		});
	});

	function onVisibilityChange() {
		if (document.hidden) {
			if (!options.isRunning()) return;
			tabHiddenAt = Date.now();
			trackOnPageHide(
				rootStore.restApiContext,
				INSTANCE_AI.USER_LEFT_N8N_WHILE_AI_ASSISTANT_RUNNING,
				{
					thread_id: options.threadId(),
				},
			);
			return;
		}
		if (tabHiddenAt === undefined) return;
		const timeAway = Date.now() - tabHiddenAt;
		tabHiddenAt = undefined;
		telemetry.track(INSTANCE_AI.USER_RETURNED_TO_N8N_WHILE_AI_ASSISTANT_RUNNING, {
			thread_id: options.threadId(),
			time_away_ms: timeAway,
		});
	}
}
