import { onScopeDispose, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import type { PushMessage } from '@n8n/api-types';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

export interface PushTriggerTiming {
	/** The trigger runs this many milliseconds after the last matching message. */
	wait: number;
	/** When set, a long run of messages still runs the trigger once in this time. */
	maxWait?: number;
}

/**
 * Runs `onTrigger` once for a burst of push messages that `matches` accepts, while `enabled` is
 * true. A push message only tells that something changed, so `onTrigger` loads the data again.
 *
 * One run goes at a time, and at most one more waits for it (as in `useAgentExecutionUpdates`).
 * A slow request then does not overlap the next one.
 */
export function usePushTrigger(
	enabled: MaybeRefOrGetter<boolean>,
	matches: (event: PushMessage) => boolean,
	onTrigger: () => unknown,
	timing: PushTriggerTiming,
) {
	let stopListening: (() => void) | undefined;
	let running = false;
	let queued = false;

	function run(): void {
		// A timer or a queued run can end after the flag turned off or the owner unmounted.
		if (!stopListening) return;
		if (running) {
			queued = true;
			return;
		}
		running = true;
		// The executor calls `onTrigger` at once, and an error in it cannot escape the push handler.
		void new Promise((resolve) => resolve(onTrigger()))
			.catch(() => undefined)
			.finally(() => {
				running = false;
				if (!queued) return;
				queued = false;
				run();
			});
	}

	const trigger = useDebounceFn(run, timing.wait, { maxWait: timing.maxWait });

	function start() {
		if (stopListening) return;
		const pushStore = usePushConnectionStore();
		const removeListener = pushStore.addEventListener((event) => {
			if (matches(event)) void trigger();
		});
		// Pages without a workflow or chat do not open the push connection, so the sidebar asks
		// for it. The store counts the owners, so this closes it only when no page needs it.
		pushStore.pushConnect();
		stopListening = () => {
			removeListener();
			pushStore.pushDisconnect();
		};
	}

	function stop() {
		stopListening?.();
		stopListening = undefined;
		queued = false;
	}

	watch(
		() => toValue(enabled),
		(isOn) => (isOn ? start() : stop()),
		{ immediate: true },
	);
	onScopeDispose(stop);
}
