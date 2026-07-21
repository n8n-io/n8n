import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useNow } from '@vueuse/core';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const MINUTE_MS = 60_000;
const HOUR_MINUTES = 60;
const DAY_MINUTES = HOUR_MINUTES * 24;

export function useTrialCountdown(): { countdownText: ComputedRef<string | undefined> } {
	const cloudPlanStore = useCloudPlanStore();
	const now = useNow({ interval: 30_000 });

	const countdownText = computed(() => {
		const expirationDate = cloudPlanStore.currentPlanData?.expirationDate;
		if (!expirationDate) {
			return undefined;
		}

		const msLeft = Date.parse(expirationDate) - now.value.getTime();
		if (msLeft <= 0) {
			return undefined;
		}

		const totalMinutes = Math.floor(msLeft / MINUTE_MS);
		const days = Math.floor(totalMinutes / DAY_MINUTES);
		const hours = Math.floor((totalMinutes % DAY_MINUTES) / HOUR_MINUTES);
		const minutes = totalMinutes % HOUR_MINUTES;

		const segments: string[] = [];
		if (days > 0) {
			segments.push(`${days}d`);
		}
		if (days > 0 || hours > 0) {
			segments.push(`${hours}h`);
		}
		segments.push(`${minutes}m`);

		return segments.join(' ');
	});

	return { countdownText };
}
