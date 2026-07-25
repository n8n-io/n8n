import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

import {
	LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN,
	LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN,
} from '@/app/constants/localStorage';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useWorkflowReviewDialogPreferences } from './useWorkflowReviewDialogPreferences';

describe('useWorkflowReviewDialogPreferences', () => {
	beforeEach(() => {
		localStorage.clear();
		setActivePinia(createPinia());
	});

	it('persists both preferences for the current user', async () => {
		useUsersStore().currentUserId = 'user-1';
		const { publishChoiceDismissed, submittedDialogDismissed } =
			useWorkflowReviewDialogPreferences();

		publishChoiceDismissed.value = true;
		submittedDialogDismissed.value = true;
		await nextTick();

		expect(
			localStorage.getItem(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN('user-1')),
		).toBe('true');
		expect(
			localStorage.getItem(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN('user-1')),
		).toBe('true');
	});

	it('keeps preferences independent between users', () => {
		useUsersStore().currentUserId = 'user-1';
		useWorkflowReviewDialogPreferences().publishChoiceDismissed.value = true;

		setActivePinia(createPinia());
		useUsersStore().currentUserId = 'user-2';
		const { publishChoiceDismissed, submittedDialogDismissed } =
			useWorkflowReviewDialogPreferences();

		expect(publishChoiceDismissed.value).toBe(false);
		expect(submittedDialogDismissed.value).toBe(false);
	});

	it('uses non-persistent defaults when there is no current user', async () => {
		const { publishChoiceDismissed, submittedDialogDismissed } =
			useWorkflowReviewDialogPreferences();

		publishChoiceDismissed.value = true;
		submittedDialogDismissed.value = true;
		await nextTick();

		expect(
			localStorage.getItem(LOCAL_STORAGE_WORKFLOW_REVIEW_PUBLISH_CHOICE_HIDDEN('')),
		).toBeNull();
		expect(
			localStorage.getItem(LOCAL_STORAGE_WORKFLOW_REVIEW_SUBMITTED_DIALOG_HIDDEN('')),
		).toBeNull();
	});
});
