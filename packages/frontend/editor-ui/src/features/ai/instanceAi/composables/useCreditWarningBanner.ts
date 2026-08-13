import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

/**
 * Shared credit-warning banner state used by every Instance AI view leaf.
 * The banner becomes dismissible the moment credits drop below the warning
 * threshold; subsequent push updates within the low-credits zone don't
 * re-show a banner the user already dismissed.
 */
export function useCreditWarningBanner(isLowCredits: MaybeRefOrGetter<boolean>) {
	const dismissed = ref(false);

	watch(
		() => toValue(isLowCredits),
		(isLow, wasLow) => {
			// Only reset dismissal when transitioning INTO low-credits state
			// (e.g. from >10% to <=10%).
			if (isLow && !wasLow) {
				dismissed.value = false;
			}
		},
	);

	const visible = computed(() => toValue(isLowCredits) && !dismissed.value);

	function dismiss(): void {
		dismissed.value = true;
	}

	return { visible, dismiss };
}
