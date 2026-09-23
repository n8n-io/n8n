import { computed } from 'vue';

import { useCloudPlanStore } from '../cloudPlan.store';
import { useSettingsStore } from '../settings.store';
import { useUsersStore } from '../users.store';

/**
 * GA date for the assistant Cloud UBB top-up flow. After this instant every
 * cloud deployment gets the top-up destination without a per-instance license
 * flag; before it, the flow is opt-in through
 * `feat:aiAssistantCloudUbbEntitlement`.
 */
export const ASSISTANT_TOP_UP_GA_DATE = new Date('2026-10-01T00:00:00Z');

/**
 * Whether a click on an assistant credit CTA should route to the Cloud
 * usage/top-up page instead of the plan-change page. Eligibility is limited to
 * cloud instance owners on a paid, non-activation-capped state; trials keep the
 * plan-upgrade path.
 */
export function useAssistantTopUpEligibility() {
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();

	const isEligible = computed(() => {
		if (!settingsStore.isCloudDeployment) return false;
		if (!usersStore.isInstanceOwner) return false;
		if (cloudPlanStore.userIsTrialing) return false;
		if (settingsStore.moduleSettings?.['instance-ai']?.activationCapped) return false;

		const pastGa = Date.now() >= ASSISTANT_TOP_UP_GA_DATE.getTime();
		return pastGa || settingsStore.isAiAssistantCloudUbbEnabled;
	});

	return { isEligible };
}
