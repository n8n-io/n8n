import { UNLIMITED_CREDITS, type InstanceAiCredits } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { getInstanceAiCredits } from './instanceAi.api';

/**
 * The Assistant credits of the instance. Both Assistant runtimes use this store,
 * so it holds no thread state. Each runtime keeps the credit total of its own
 * threads. `fetchCredits` loads the balance, and the `updateInstanceAiCredits`
 * push keeps it current. Login and logout reload the page, so it needs no reset.
 */
export const useAssistantCreditsStore = defineStore('assistantCredits', () => {
	const rootStore = useRootStore();

	const creditsQuota = ref<number | undefined>(undefined);
	const creditsClaimed = ref<number | undefined>(undefined);

	const creditsRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsClaimed.value === undefined ||
			creditsQuota.value === UNLIMITED_CREDITS
		) {
			return undefined;
		}
		return Math.max(0, creditsQuota.value - creditsClaimed.value);
	});

	const creditsPercentageRemaining = computed(() => {
		if (
			creditsQuota.value === undefined ||
			creditsQuota.value === UNLIMITED_CREDITS ||
			creditsRemaining.value === undefined
		) {
			return undefined;
		}
		if (creditsQuota.value === 0) return 0;
		return (creditsRemaining.value / creditsQuota.value) * 100;
	});

	const isLowCredits = computed(
		() => creditsPercentageRemaining.value !== undefined && creditsPercentageRemaining.value <= 10,
	);

	/** Send is blocked. A positive low balance stays a dismissible warning. */
	const isOutOfCredits = computed(() => creditsRemaining.value === 0);

	function setCredits(credits: InstanceAiCredits): void {
		creditsQuota.value = credits.creditsQuota;
		creditsClaimed.value = credits.creditsClaimed;
	}

	async function fetchCredits(): Promise<void> {
		try {
			setCredits(await getInstanceAiCredits(rootStore.restApiContext));
		} catch {
			// Non-critical — credits display is optional
		}
	}

	return {
		creditsQuota,
		creditsClaimed,
		creditsRemaining,
		isLowCredits,
		isOutOfCredits,
		setCredits,
		fetchCredits,
	};
});
