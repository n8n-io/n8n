import { useUsersStore } from '@/features/settings/users/users.store';
import { useEmptyStateDetection } from '@/features/workflows/readyToRun/composables/useEmptyStateDetection';
import { computed } from 'vue';

export function useSurfaceMcpToNewCloudUsersEligibility() {
	const usersStore = useUsersStore();
	const { isTrulyEmpty } = useEmptyStateDetection();

	const isEligible = computed(() => true && usersStore.isAdminOrOwner && isTrulyEmpty());

	return {
		isEligible,
	};
}
