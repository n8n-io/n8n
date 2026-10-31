import { computed } from 'vue';

import { useCloudPlanStore } from '../cloudPlan.store';
import { useSettingsStore } from '../settings.store';
import { useUsersStore } from '../users.store';

/**
 * Whether a click on an assistant credit CTA should route to the Cloud
 * usage/top-up page instead of the plan-change page. Eligibility is limited to
 * cloud instance owners on a paid plan; trials keep the plan-upgrade path.
 */
export function useAssistantTopUpEligibility() {
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();
	const cloudPlanStore = useCloudPlanStore();

	const isEligible = computed(
		() =>
			settingsStore.isCloudDeployment &&
			usersStore.isInstanceOwner &&
			!cloudPlanStore.userIsTrialing,
	);

	return { isEligible };
}
