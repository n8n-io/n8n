import type { WorkflowReviewRequirementLevel } from '@n8n/api-types';
import { computed } from 'vue';

import { EnterpriseEditionFeature } from '@/app/constants';
import {
	ProjectTypes,
	type ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import { useWorkflowReviewStatusStore } from '@/features/workflow-reviews/reviewStatus.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

type ReviewableWorkflow = {
	id: string;
	homeProject?: Pick<ProjectSharingData, 'type'> | null;
};

export const useWorkflowReviewsFeature = () => {
	const settingsStore = useSettingsStore();
	const reviewStatusStore = useWorkflowReviewStatusStore();

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

	const isInstanceApprovalRequired = computed(
		() =>
			isWorkflowReviewsEnabled.value &&
			settingsStore.settings.workflowReviews?.alwaysRequired === true,
	);

	/**
	 * The level the server reports for the workflow. Before the first fetch, the instance rule
	 * applies, and an unknown home project counts as a team project, so the rule fails closed.
	 */
	function reviewRequiredBy(workflow: ReviewableWorkflow): WorkflowReviewRequirementLevel | null {
		if (!isWorkflowReviewsEnabled.value) return null;

		const fromServer = reviewStatusStore.reviewRequiredBy(workflow.id);
		if (fromServer !== undefined) return fromServer;

		return isInstanceApprovalRequired.value && workflow.homeProject?.type !== ProjectTypes.Personal
			? 'instance'
			: null;
	}

	function isReviewRequiredFor(workflow: ReviewableWorkflow): boolean {
		return reviewRequiredBy(workflow) !== null;
	}

	return {
		isWorkflowReviewsAvailable,
		isWorkflowReviewsEnabled,
		isInstanceApprovalRequired,
		reviewRequiredBy,
		isReviewRequiredFor,
	};
};
