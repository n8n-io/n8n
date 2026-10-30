import { useMediaQuery } from '@vueuse/core';
import { onScopeDispose, ref, watch } from 'vue';

const DEFAULT_CHAR_MS = 30;

/**
 * Types a text one character at a time, as if someone typed it. A new text
 * starts from the beginning. With reduced motion, the whole text shows at once.
 */
export function useTypewriter(text: () => string, options: { charMs?: number } = {}) {
	const { charMs = DEFAULT_CHAR_MS } = options;
	const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
	const typed = ref('');
	let timer: ReturnType<typeof setInterval> | undefined;

	function stop() {
		clearInterval(timer);
		timer = undefined;
	}

	watch(
		text,
		(target) => {
			stop();
			if (reducedMotion.value) {
				typed.value = target;
				return;
			}
			typed.value = '';
			timer = setInterval(() => {
				typed.value = target.slice(0, typed.value.length + 1);
				if (typed.value.length >= target.length) stop();
			}, charMs);
		},
		{ immediate: true },
	);

	onScopeDispose(stop);

	return typed;
}
