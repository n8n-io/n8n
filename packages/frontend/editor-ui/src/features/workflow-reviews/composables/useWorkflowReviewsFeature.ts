import { computed } from 'vue';

import { EnterpriseEditionFeature } from '@/app/constants';
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

	return {
		isWorkflowReviewsAvailable,
		isWorkflowReviewsEnabled,
	};
};
