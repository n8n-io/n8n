import { onMounted, ref, type Ref } from 'vue';

import { formatDisplayNumber, parseDisplayNumber } from './utils';

const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts a formatted number up from 0 on mount (700 ms, ease-out, after `delayMs`).
 * Non-numeric values and reduced-motion users get the final value immediately.
 */
export function useCountUp(
	value: () => string,
	options: { enabled: () => boolean; delayMs?: number; durationMs?: number },
): Ref<string> {
	const display = ref(value());

	onMounted(() => {
		const parsed = parseDisplayNumber(value());
		const reduced =
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
		if (!parsed || !options.enabled() || reduced || typeof requestAnimationFrame === 'undefined') {
			display.value = value();
			return;
		}
		const duration = options.durationMs ?? 700;
		const delay = options.delayMs ?? 250;
		display.value = formatDisplayNumber(0, parsed.decimals);
		let start: number | null = null;
		const tick = (now: number) => {
			if (start === null) start = now;
			const progress = Math.min(1, (now - start) / duration);
			display.value = formatDisplayNumber(parsed.value * EASE_OUT(progress), parsed.decimals);
			if (progress < 1) requestAnimationFrame(tick);
			else display.value = value();
		};
		setTimeout(() => requestAnimationFrame(tick), delay);
	});

	return display;
}
