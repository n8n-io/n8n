import { computed } from 'vue';

import { useCloudPlanStore } from '../cloudPlan.store';
import { useSettingsStore } from '../settings.store';
import { useUsersStore } from '../users.store';
import { ASSISTANT_CLOUD_UBB_GA_DATE, useCloudUbbActive } from './useCloudUbbActive';

/**
 * @deprecated Prefer importing {@link ASSISTANT_CLOUD_UBB_GA_DATE} from
 * `useCloudUbbActive`. Re-exported here so existing callers keep resolving.
 */
export const ASSISTANT_TOP_UP_GA_DATE = ASSISTANT_CLOUD_UBB_GA_DATE;

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
	const { isActive: isCloudUbbActive } = useCloudUbbActive();

	const isEligible = computed(() => {
		if (!settingsStore.isCloudDeployment) return false;
		if (!usersStore.isInstanceOwner) return false;
		if (cloudPlanStore.userIsTrialing) return false;
		if (settingsStore.moduleSettings?.['instance-ai']?.activationCapped) return false;
		return isCloudUbbActive.value;
	});

	return { isEligible };
}
