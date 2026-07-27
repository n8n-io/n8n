import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useEmptyStateDetection } from '@/features/workflows/readyToRun/composables/useEmptyStateDetection';
import { computed } from 'vue';

export function useSurfaceMcpToNewCloudUsersEligibility() {
	const usersStore = useUsersStore();
	const { isTrulyEmpty } = useEmptyStateDetection();
	const settingsStore = useSettingsStore();
	const cloudPlanStore = useCloudPlanStore();

	const isEligible = computed(
		() =>
			settingsStore.isCloudDeployment &&
			cloudPlanStore.userIsTrialing &&
			usersStore.isAdminOrOwner &&
			isTrulyEmpty(),
	);

	return {
		isEligible,
	};
}
