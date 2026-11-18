import { onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

export const CANVAS_SLEEP_DELAY = 30_000;

export function useCanvasSleep(
	eligible: MaybeRefOrGetter<boolean>,
	delay: MaybeRefOrGetter<number> = CANVAS_SLEEP_DELAY,
) {
	const sleeping = ref(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let mounted = false;

	function clearTimer() {
		clearTimeout(timer);
		timer = undefined;
	}

	function sleepNow() {
		clearTimer();
		sleeping.value = toValue(eligible) && !document.hidden;
	}

	function wake() {
		clearTimer();
		sleeping.value = false;
		if (mounted && toValue(eligible) && !document.hidden) {
			timer = setTimeout(sleepNow, Math.max(500, toValue(delay)));
		}
	}

	const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'focusin', 'visibilitychange'];
	onMounted(() => {
		mounted = true;
		for (const event of events)
			document.addEventListener(event, wake, { passive: true, capture: true });
		wake();
	});
	watch([() => toValue(eligible), () => toValue(delay)], wake);
	onBeforeUnmount(() => {
		mounted = false;
		clearTimer();
		for (const event of events) document.removeEventListener(event, wake, true);
	});

	return { sleeping, sleepNow, wake };
}
