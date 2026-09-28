import type { AppPreviewStatus } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useIntervalFn } from '@vueuse/core';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { computed, onScopeDispose, ref, toValue, watch } from 'vue';

import { ensureAppPreviewApi } from '@/features/apps/apps.api';

export const LIVE_PREVIEW_POLL_MS = 1500;
// A cold open restores the app and runs npm install in a new sandbox before Vite starts.
export const LIVE_PREVIEW_POLL_TIMEOUT_MS = 240_000;
export const LIVE_PREVIEW_HEARTBEAT_MS = 10 * 60_000;

type LivePreviewNext = 'poll' | 'heartbeat' | 'stop';

type LivePreviewTransition = {
	status: AppPreviewStatus;
	next: LivePreviewNext;
	/** Start of the current `starting` streak; null outside one. */
	pollingSince: number | null;
};

/** Pure step of the live-preview state machine: what one ensure answer leads to. */
export function transitionLivePreview(
	answer: AppPreviewStatus,
	pollingSince: number | null,
	now: number,
): LivePreviewTransition {
	if (answer.status === 'starting') {
		const since = pollingSince ?? now;
		if (now - since >= LIVE_PREVIEW_POLL_TIMEOUT_MS) {
			return {
				status: { status: 'unavailable', reason: 'start-failed' },
				next: 'stop',
				pollingSince: null,
			};
		}
		return { status: answer, next: 'poll', pollingSince: since };
	}
	if (answer.status === 'ready') return { status: answer, next: 'heartbeat', pollingSince: null };
	return { status: answer, next: 'stop', pollingSince: null };
}

/**
 * Names the content the frame shows: the build sequence of a built preview
 * (`?b=`), else the latest source edit the dev server has picked up. Undefined
 * while there is no frame.
 */
export function previewContentKey(
	liveUrl: string | undefined,
	latestSourceEditId: string | undefined,
): string | undefined {
	if (liveUrl === undefined) return undefined;
	const buildSeq = new URL(liveUrl, window.location.origin).searchParams.get('b');
	return buildSeq === null ? latestSourceEditId : `b:${buildSeq}`;
}

type AppLivePreviewTarget = {
	projectId: MaybeRefOrGetter<string>;
	appId: MaybeRefOrGetter<string>;
};

/**
 * Keeps the app's dev server alive while `visible` is true: ensures on
 * start and on every return to visibility, polls while it starts, and
 * heartbeats once it is ready. Hidden pauses everything. A new
 * `builtVersionId` retries a preview that stopped for lack of a build. The end
 * of a run (`running` true → false) ensures again: a built preview answers
 * with the URL of the turn's rebuild, a dev server with the same URL; the
 * server answers it only once the turn's source snapshot has landed, and
 * `settledCount` moves so the host can re-read the app's publish state.
 * `previewAhead` says whether the frame shows content newer than what
 * `markPreviewPublished` last confirmed as published: a newer build sequence,
 * or (dev server) a newer `latestSourceEditId`.
 */
export function useAppLivePreview(
	target: AppLivePreviewTarget,
	visible: Ref<boolean>,
	builtVersionId?: MaybeRefOrGetter<string | undefined>,
	running?: MaybeRefOrGetter<boolean>,
	latestSourceEditId?: MaybeRefOrGetter<string | undefined>,
) {
	const rootStore = useRootStore();
	// `starting` from the first ask: the host shows a starting preview, never a blank gap, until the server answers.
	const status = ref<AppPreviewStatus>({ status: 'starting' });
	const settledCount = ref(0);
	const publishedContentKey = ref<string>();

	let pollingSince: number | null = null;
	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	// Bumped on every ensure and on stop, so a stale answer cannot revive timers.
	let requestSeq = 0;

	const heartbeat = useIntervalFn(
		() => {
			void ensure();
		},
		LIVE_PREVIEW_HEARTBEAT_MS,
		{ immediate: false },
	);

	function clearPoll() {
		if (pollTimer === undefined) return;
		clearTimeout(pollTimer);
		pollTimer = undefined;
	}

	async function ensure() {
		const seq = ++requestSeq;
		clearPoll();
		const answer = await ensureAppPreviewApi(
			rootStore.restApiContext,
			toValue(target.projectId),
			toValue(target.appId),
		).catch((): AppPreviewStatus => ({ status: 'unavailable', reason: 'sandbox' }));
		if (seq !== requestSeq) return;

		const result = transitionLivePreview(answer, pollingSince, Date.now());
		pollingSince = result.pollingSince;
		status.value = result.status;
		if (result.next === 'poll') {
			pollTimer = setTimeout(() => {
				void ensure();
			}, LIVE_PREVIEW_POLL_MS);
		}
		if (result.next === 'heartbeat') heartbeat.resume();
		else heartbeat.pause();
	}

	function stop() {
		requestSeq++;
		clearPoll();
		heartbeat.pause();
	}

	watch(
		visible,
		(isVisible) => {
			if (!isVisible) {
				stop();
				return;
			}
			pollingSince = null;
			void ensure();
		},
		{ immediate: true },
	);

	// A publish that lands after `no-source` or a failed start means the app now
	// has a stored source to restore, so it is the cue to try again.
	watch(
		() => toValue(builtVersionId),
		() => {
			const current = status.value.status;
			if (!visible.value || (current !== 'no-source' && current !== 'unavailable')) return;
			pollingSince = null;
			void ensure();
		},
	);

	// A `starting` preview is being polled already; `unsupported` does not change with a turn.
	watch(
		() => toValue(running) ?? false,
		(isRunning, wasRunning) => {
			const current = status.value.status;
			if (isRunning || !wasRunning || !visible.value) return;
			if (current !== 'ready' && current !== 'no-source' && current !== 'unavailable') return;
			pollingSince = null;
			void ensure().then(() => {
				settledCount.value += 1;
			});
		},
	);

	onScopeDispose(stop);

	const liveUrl = computed(() => (status.value.status === 'ready' ? status.value.url : undefined));
	const reason = computed(() => ('reason' in status.value ? status.value.reason : undefined));
	const contentKey = computed(() => previewContentKey(liveUrl.value, toValue(latestSourceEditId)));
	const previewAhead = computed(
		() => contentKey.value !== undefined && contentKey.value !== publishedContentKey.value,
	);

	/** The server confirmed that the published version matches what the frame shows now. */
	function markPreviewPublished() {
		publishedContentKey.value = contentKey.value;
	}

	return { status, liveUrl, reason, settledCount, previewAhead, markPreviewPublished };
}
