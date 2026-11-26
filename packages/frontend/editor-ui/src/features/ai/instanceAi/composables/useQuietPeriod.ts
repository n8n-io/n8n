import { onUnmounted, ref, watch } from 'vue';

/**
 * True after `progressToken` stays the same for `delayMs`.
 *
 * A change of the token starts the count again. The caller changes the token
 * each time the run shows progress, such as a new entry or more streamed text.
 */
export function useQuietPeriod(progressToken: () => string, delayMs: number) {
	const quiet = ref(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function clear() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	function restart() {
		clear();
		quiet.value = false;
		timer = setTimeout(() => {
			quiet.value = true;
			timer = null;
		}, delayMs);
	}

	watch(progressToken, restart, { immediate: true });
	onUnmounted(clear);

	return quiet;
}
