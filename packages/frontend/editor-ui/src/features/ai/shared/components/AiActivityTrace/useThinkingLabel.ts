import { useI18n } from '@n8n/i18n';
import { computed, onUnmounted, ref, watch } from 'vue';
import { useThinkingWordRotation } from '../../composables/useThinkingWords';
import type { AiThinkingSegment } from './types';

export interface ThinkingLabelSource {
	segments: AiThinkingSegment[];
	active: boolean;
	awaitingInput?: boolean;
	durationSec?: number;
	activityLabel?: string;
	idleLabel?: string;
	/** Replaces "Thought for Ns" when done. */
	settledLabel?: string;
}

/** Formats seconds as `45s` or `1m 12s`. */
export function formatThinkingDuration(totalSec: number): string {
	if (totalSec < 60) return `${totalSec}s`;
	return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
}

/**
 * Label of a thinking step. While active, it rotates thinking words, such as
 * "Pondering…". The trace text shows only in the
 * collapsed content. `meta` holds the elapsed time. When done, it reads "Thought for Ns".
 */
export function useThinkingLabel(source: () => ThinkingLabelSource) {
	const i18n = useI18n();

	const nowMs = ref(Date.now());
	const activeSinceMs = ref<number | null>(null);
	const settledElapsedSec = ref(0);
	let ticker: ReturnType<typeof setInterval> | null = null;

	const isCounting = computed(() => source().active && source().awaitingInput !== true);

	/** Rotates only while no caller label replaces it. */
	const thinkingWord = useThinkingWordRotation({
		active: () => isCounting.value && !source().activityLabel && !source().idleLabel,
	});

	const elapsedSec = computed(() => {
		const live =
			activeSinceMs.value === null
				? 0
				: Math.max(0, Math.floor((nowMs.value - activeSinceMs.value) / 1000));
		return settledElapsedSec.value + live;
	});

	function stopTicker() {
		if (ticker) {
			clearInterval(ticker);
			ticker = null;
		}
	}

	watch(
		isCounting,
		(counting) => {
			if (counting) {
				nowMs.value = Date.now();
				activeSinceMs.value = Date.now();
				ticker ??= setInterval(() => {
					nowMs.value = Date.now();
				}, 1000);
				return;
			}

			/** A pause for input starts the count again, so the wait does not count as thinking. */
			settledElapsedSec.value = source().awaitingInput === true ? 0 : elapsedSec.value;
			activeSinceMs.value = null;
			stopTicker();
		},
		{ immediate: true },
	);

	onUnmounted(stopTicker);

	const label = computed(() => {
		const { active, awaitingInput, durationSec, activityLabel, idleLabel, settledLabel } = source();

		if (!active) {
			if (settledLabel) return settledLabel;
			const observed = settledElapsedSec.value >= 1 ? settledElapsedSec.value : undefined;
			const duration =
				durationSec === undefined
					? observed
					: observed === undefined
						? durationSec
						: Math.max(durationSec, observed);
			return duration === undefined
				? i18n.baseText('ai.thinking.doneFallback')
				: i18n.baseText('ai.thinking.done', {
						interpolate: { duration: formatThinkingDuration(duration) },
					});
		}

		if (awaitingInput === true) return i18n.baseText('ai.thinking.waitingForInput');

		return activityLabel ?? idleLabel ?? thinkingWord.value ?? i18n.baseText('ai.thinking.active');
	});

	const meta = computed(() =>
		isCounting.value && elapsedSec.value >= 1
			? formatThinkingDuration(elapsedSec.value)
			: undefined,
	);

	return { label, meta };
}
