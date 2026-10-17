import { useNow } from '@vueuse/core';
import { computed } from 'vue';

import { useSettingsStore } from '../settings.store';

/**
 * GA date for the assistant Cloud UBB rollout. After this instant every cloud
 * deployment is treated as UBB-active without a per-instance license flag;
 * before it, activation is opt-in through `feat:aiAssistantCloudUbbEntitlement`.
 */
export const ASSISTANT_CLOUD_UBB_GA_DATE = new Date('2026-10-01T00:00:00Z');

/**
 * Whether Cloud UBB is the balance authority for this instance's assistant.
 * True when the license carries `feat:aiAssistantCloudUbbEntitlement`, or once
 * we pass the GA cutoff. Extracted from `useAssistantTopUpEligibility` so
 * consumers that only care about the wallet's shape — the credit banner text,
 * or anything else that renders wallet figures — don't inherit its cloud-owner /
 * non-trial / non-capped gates.
 */
export function useCloudUbbActive() {
	const settingsStore = useSettingsStore();
	// Reactive clock so a tab kept open across the GA cutoff picks it up on its
	// own. One-minute polling matches useAssistantTopUpEligibility.
	const now = useNow({ interval: 60_000 });

	const isActive = computed(() => {
		const pastGa = now.value.getTime() >= ASSISTANT_CLOUD_UBB_GA_DATE.getTime();
		return pastGa || settingsStore.isAiAssistantCloudUbbEnabled;
	});

	return { isActive };
}
