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

export type LivePreviewNext = 'poll' | 'heartbeat' | 'stop';

export type LivePreviewTransition = {
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

export type AppLivePreviewTarget = {
	projectId: MaybeRefOrGetter<string>;
	appId: MaybeRefOrGetter<string>;
	threadId: MaybeRefOrGetter<string>;
};

/**
 * Keeps the thread's dev server alive while `visible` is true: ensures on
 * start and on every return to visibility, polls while it starts, and
 * heartbeats once it is ready. Hidden pauses everything. A new
 * `builtVersionId` retries a preview that stopped for lack of a build.
 */
export function useAppLivePreview(
	target: AppLivePreviewTarget,
	visible: Ref<boolean>,
	builtVersionId?: MaybeRefOrGetter<string | undefined>,
) {
	const rootStore = useRootStore();
	const status = ref<AppPreviewStatus>();

	let pollingSince: number | null = null;
	let pollTimer: ReturnType<typeof setTimeout> | undefined;
	// Bumped on every ensure and on stop, so a stale answer cannot revive timers.
	let requestSeq = 0;

	const heartbeat = useIntervalFn(() => void ensure(), LIVE_PREVIEW_HEARTBEAT_MS, {
		immediate: false,
	});

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
			toValue(target.threadId),
		).catch((): AppPreviewStatus => ({ status: 'unavailable', reason: 'sandbox' }));
		if (seq !== requestSeq) return;

		const result = transitionLivePreview(answer, pollingSince, Date.now());
		pollingSince = result.pollingSince;
		status.value = result.status;
		if (result.next === 'poll') {
			pollTimer = setTimeout(() => void ensure(), LIVE_PREVIEW_POLL_MS);
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
			const current = status.value?.status;
			if (!visible.value || (current !== 'no-source' && current !== 'unavailable')) return;
			pollingSince = null;
			void ensure();
		},
	);

	onScopeDispose(stop);

	const liveUrl = computed(() => (status.value?.status === 'ready' ? status.value.url : undefined));
	const reason = computed(() =>
		status.value && 'reason' in status.value ? status.value.reason : undefined,
	);

	return { status, liveUrl, reason };
}
