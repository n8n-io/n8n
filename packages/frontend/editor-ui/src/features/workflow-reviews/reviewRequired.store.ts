import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';

import { LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW } from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';

export const useReviewRequiredStore = defineStore('workflowReviewRequired', () => {
	const usersStore = useUsersStore();
	const storage = useLocalStorage<Record<string, boolean>>(
		LOCAL_STORAGE_WORKFLOW_REVIEW_REQUIRED_BY_WORKFLOW(usersStore.currentUserId ?? 'anonymous'),
		{},
		{ deep: true, flush: 'sync' },
	);

	const isReviewRequired = (workflowId: string): boolean => storage.value[workflowId] ?? false;

	const setReviewRequired = (workflowId: string, value: boolean): void => {
		storage.value[workflowId] = value;
	};

	return { isReviewRequired, setReviewRequired };
});
