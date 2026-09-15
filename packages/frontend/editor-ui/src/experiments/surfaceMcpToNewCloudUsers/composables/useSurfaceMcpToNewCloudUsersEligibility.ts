import { useCloudPlanStore } from '@n8n/stores/cloudPlan.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
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
