import { onBeforeUnmount, ref } from 'vue';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

const TICK_INTERVAL_MS = 1000;

export interface LiveRecordingScreenshot {
	actionId: string;
	mimeType: string;
	data: string;
}

/**
 * Live status of an AI-triggered recording for one thread, driven purely by
 * `instanceAiRecordingStateChanged`/`instanceAiRecordingScreenshotReceived` push
 * events — 'recording' while it's in progress, 'stopped'/'discarded' are
 * terminal. `elapsedMs` is ticked locally from a start time stamped on the
 * first 'recording' event rather than carried in the push payload; it only
 * needs second-level precision, and the ticker only runs while a recording is
 * actually live.
 *
 * On 'stopped', the last known `actionCount`/`elapsedMs`/`screenshots` are kept
 * (not zeroed) so the artifact panel can keep showing a finished recap instead
 * of the tab disappearing the instant recording stops — `hasRecap` flips on to
 * signal that. 'discarded' clears everything instead, since there's nothing
 * worth recapping.
 *
 * Known gap: if the thread is (re)opened while a recording is already in
 * progress, nothing surfaces until the next push event (the next streamed
 * action, or a stop/discard) — there's no on-mount status fetch.
 */
export function useLiveRecordingState(threadId: () => string) {
	const isRecording = ref(false);
	const hasRecap = ref(false);
	const actionCount = ref(0);
	const caption = ref<string>();
	const elapsedMs = ref(0);
	const screenshots = ref<LiveRecordingScreenshot[]>([]);
	let startedAt: number | undefined;
	let tickInterval: ReturnType<typeof setInterval> | undefined;

	function stopTicking() {
		clearInterval(tickInterval);
		tickInterval = undefined;
	}

	const pushStore = usePushConnectionStore();
	const removeListener = pushStore.addEventListener((message) => {
		if (message.type === 'instanceAiRecordingScreenshotReceived') {
			if (message.data.threadId !== threadId()) return;
			screenshots.value = [
				...screenshots.value,
				{
					actionId: message.data.actionId,
					mimeType: message.data.mimeType,
					data: message.data.data,
				},
			];
			return;
		}

		if (message.type !== 'instanceAiRecordingStateChanged') return;
		if (message.data.threadId !== threadId()) return;

		if (message.data.status === 'recording') {
			if (!isRecording.value) {
				isRecording.value = true;
				hasRecap.value = false;
				screenshots.value = [];
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
			startedAt = undefined;
			stopTicking();
			if (message.data.status === 'stopped') {
				hasRecap.value = true;
			} else {
				hasRecap.value = false;
				actionCount.value = 0;
				caption.value = undefined;
				elapsedMs.value = 0;
				screenshots.value = [];
			}
		}
	});

	onBeforeUnmount(() => {
		removeListener?.();
		stopTicking();
	});

	return { isRecording, hasRecap, actionCount, caption, elapsedMs, screenshots };
}

export type LiveRecordingState = ReturnType<typeof useLiveRecordingState>;
