import { computed, onBeforeUnmount, ref } from 'vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

/**
 * Live status of an AI-triggered recording for one thread, driven purely by
 * `instanceAiRecordingStateChanged` push events — 'recording' while it's in
 * progress, 'stopped'/'discarded' are terminal. `startedAt` is stamped
 * locally on the first 'recording' event rather than carried in the push
 * payload; elapsed time only needs second-level precision.
 *
 * Known gap: if the thread is (re)opened while a recording is already in
 * progress, nothing surfaces until the next push event (the next streamed
 * action, or a stop/discard) — there's no on-mount status fetch.
 */
export function useLiveRecordingState(threadId: () => string) {
	const isRecording = ref(false);
	const actionCount = ref(0);
	const startedAt = ref<number>();
	const nowMs = ref(Date.now());

	const pushStore = usePushConnectionStore();
	const removeListener = pushStore.addEventListener((message) => {
		if (message.type !== 'instanceAiRecordingStateChanged') return;
		if (message.data.threadId !== threadId()) return;

		if (message.data.status === 'recording') {
			if (!isRecording.value) startedAt.value = Date.now();
			isRecording.value = true;
			actionCount.value = message.data.actionCount;
		} else {
			isRecording.value = false;
			actionCount.value = 0;
			startedAt.value = undefined;
		}
	});

	const tickInterval = setInterval(() => {
		if (isRecording.value) nowMs.value = Date.now();
	}, 1000);

	onBeforeUnmount(() => {
		removeListener?.();
		clearInterval(tickInterval);
	});

	const elapsedMs = computed(() =>
		startedAt.value === undefined ? 0 : Math.max(0, nowMs.value - startedAt.value),
	);

	return { isRecording, actionCount, elapsedMs };
}
