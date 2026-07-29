import { useLocalStorage } from '@vueuse/core';
import { ref } from 'vue';

import {
	LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN,
	LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN,
} from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';

export const useWorkflowReviewDialogPreferences = () => {
	const usersStore = useUsersStore();
	const userId = usersStore.currentUserId;

	if (!userId) {
		return {
			publishChoiceDismissed: ref(false),
			submittedDialogDismissed: ref(false),
		};
	}

	const publishChoiceDismissed = useLocalStorage(
		LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN(userId),
		false,
		{ writeDefaults: false },
	);
	const submittedDialogDismissed = useLocalStorage(
		LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN(userId),
		false,
		{ writeDefaults: false },
	);

	return { publishChoiceDismissed, submittedDialogDismissed };
};
