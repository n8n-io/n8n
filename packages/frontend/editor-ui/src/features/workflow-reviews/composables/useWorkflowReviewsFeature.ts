import { computed } from 'vue';

import { EnterpriseEditionFeature } from '@/app/constants';
import {
	ProjectTypes,
	type ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import { useSettingsStore } from '@n8n/stores/settings.store';

export const useWorkflowReviewsFeature = () => {
	const settingsStore = useSettingsStore();

	const isWorkflowReviewsAvailable = computed(() => {
		return (
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowReviews] ?? false
		);
	});

	const isWorkflowReviewsEnabled = computed(() => {
		return (
			isWorkflowReviewsAvailable.value && settingsStore.settings.workflowReviews?.enabled === true
		);
	});

	/** An unknown home project counts as a team project, so the rule fails closed. */
	function isReviewRequiredFor(
		homeProject: Pick<ProjectSharingData, 'type'> | null | undefined,
	): boolean {
		return (
			isWorkflowReviewsEnabled.value &&
			settingsStore.settings.workflowReviews?.alwaysRequired === true &&
			homeProject?.type !== ProjectTypes.Personal
		);
	}

	return {
		isWorkflowReviewsAvailable,
		isWorkflowReviewsEnabled,
		isReviewRequiredFor,
	};
};
