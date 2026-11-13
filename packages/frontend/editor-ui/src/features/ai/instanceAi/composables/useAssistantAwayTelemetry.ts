import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { onBeforeUnmount, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import { trackOnPageHide } from '@/app/plugins/telemetry/trackOnPageHide';

const { INSTANCE_AI } = TELEMETRY_EVENT;

/** When the user left, and whether the run waited for them then. The return events report both. */
type Departure = { at: number; isAwaitingUser: boolean };

/** Threads the user left with an active run. Outlives the thread view. */
const leftThreads = new Map<string, Departure>();

/**
 * Tracks the user leaving and returning while an Assistant run is active: first
 * the thread (another thread or page), then the browser tab (another tab or
 * app, or closing the tab). A run is active from its start to its end, so it
 * includes a run paused until the user answers. `is_awaiting_user` tells the
 * two apart.
 *
 * `visibilitychange` fires before a tab closes, so it covers both tab cases.
 * The telemetry SDK loses requests that start while a tab closes, so "left n8n"
 * goes through `trackOnPageHide`, and the backend emits it.
 */
export function useAssistantAwayTelemetry(options: {
	threadId: () => string;
	/** A run is active: it started and did not finish, even if it waits for the user. */
	isRunning: () => boolean;
	/** The active run is paused until the user answers a confirmation or question. */
	isAwaitingUser: () => boolean;
}) {
	const telemetry = useTelemetry();
	const router = useRouter();
	const rootStore = useRootStore();
	let tabHidden: Departure | undefined;
	let beforeUnmount: { isRunning: boolean; isAwaitingUser: boolean } | undefined;

	onMounted(() => {
		const threadId = options.threadId();
		const departure = leftThreads.get(threadId);
		if (departure) {
			leftThreads.delete(threadId);
			telemetry.track(INSTANCE_AI.USER_RETURNED_TO_AI_ASSISTANT_THREAD, {
				thread_id: threadId,
				is_awaiting_user: departure.isAwaitingUser,
				time_away_ms: Date.now() - departure.at,
			});
		}
		document.addEventListener('visibilitychange', onVisibilityChange);
	});

	// Vue clears the template refs of child components while it unmounts them,
	// before `onUnmounted` runs, so read the run state here.
	onBeforeUnmount(() => {
		beforeUnmount = { isRunning: options.isRunning(), isAwaitingUser: options.isAwaitingUser() };
	});

	onUnmounted(() => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
		const threadId = options.threadId();
		// A discarded duplicate view unmounts while the route still points at the thread.
		if (router.currentRoute.value.params.threadId === threadId) return;
		if (!beforeUnmount?.isRunning) return;
		leftThreads.set(threadId, { at: Date.now(), isAwaitingUser: beforeUnmount.isAwaitingUser });
		telemetry.track(INSTANCE_AI.USER_LEFT_AI_ASSISTANT_THREAD_WITH_ACTIVE_RUN, {
			thread_id: threadId,
			is_awaiting_user: beforeUnmount.isAwaitingUser,
		});
	});

	function onTabHidden() {
		if (!options.isRunning()) return;
		tabHidden = { at: Date.now(), isAwaitingUser: options.isAwaitingUser() };
		trackOnPageHide(
			rootStore.restApiContext,
			INSTANCE_AI.USER_LEFT_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN,
			{
				thread_id: options.threadId(),
				is_awaiting_user: tabHidden.isAwaitingUser,
			},
		);
	}

	function onTabVisible() {
		if (!tabHidden) return;
		const departure = tabHidden;
		tabHidden = undefined;
		telemetry.track(INSTANCE_AI.USER_RETURNED_TO_N8N_WITH_ACTIVE_AI_ASSISTANT_RUN, {
			thread_id: options.threadId(),
			is_awaiting_user: departure.isAwaitingUser,
			time_away_ms: Date.now() - departure.at,
		});
	}

	function onVisibilityChange() {
		if (document.hidden) onTabHidden();
		else onTabVisible();
	}
}
