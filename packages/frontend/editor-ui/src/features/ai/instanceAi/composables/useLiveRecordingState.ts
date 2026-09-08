import { onBeforeUnmount, ref } from 'vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

const TICK_INTERVAL_MS = 1000;

/**
 * Live status of an AI-triggered recording for one thread, driven purely by
 * `instanceAiRecordingStateChanged` push events — 'recording' while it's in
 * progress, 'stopped'/'discarded' are terminal. `elapsedMs` is ticked locally
 * from a start time stamped on the first 'recording' event rather than
 * carried in the push payload; it only needs second-level precision, and the
 * ticker only runs while a recording is actually live.
 *
 * Known gap: if the thread is (re)opened while a recording is already in
 * progress, nothing surfaces until the next push event (the next streamed
 * action, or a stop/discard) — there's no on-mount status fetch.
 */
export function useLiveRecordingState(threadId: () => string) {
	const isRecording = ref(false);
	const actionCount = ref(0);
	const caption = ref<string>();
	const elapsedMs = ref(0);
	let startedAt: number | undefined;
	let tickInterval: ReturnType<typeof setInterval> | undefined;

	function stopTicking() {
		clearInterval(tickInterval);
		tickInterval = undefined;
	}

	const pushStore = usePushConnectionStore();
	const removeListener = pushStore.addEventListener((message) => {
		if (message.type !== 'instanceAiRecordingStateChanged') return;
		if (message.data.threadId !== threadId()) return;

		if (message.data.status === 'recording') {
			if (!isRecording.value) {
				isRecording.value = true;
				startedAt = Date.now();
				elapsedMs.value = 0;
				tickInterval ??= setInterval(() => {
					if (startedAt !== undefined) elapsedMs.value = Date.now() - startedAt;
				}, TICK_INTERVAL_MS);
			}
			actionCount.value = message.data.actionCount;
			if (message.data.caption) caption.value = message.data.caption;
		} else {
			isRecording.value = false;
			actionCount.value = 0;
			caption.value = undefined;
			startedAt = undefined;
			elapsedMs.value = 0;
			stopTicking();
		}
	});

	onBeforeUnmount(() => {
		removeListener?.();
		stopTicking();
	});

	return { isRecording, actionCount, caption, elapsedMs };
}
