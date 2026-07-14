import { computed } from 'vue';

import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

export function useWorkflowReviewsEnabled() {
	const settingsStore = useSettingsStore();
	const { check: checkEnvFeatureFlag } = useEnvFeatureFlag();

	const isWorkflowReviewsEnabled = computed(
		() =>
			settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.WorkflowReviews] &&
			checkEnvFeatureFlag.value('WORKFLOW_REVIEWS') &&
			(settingsStore.settings.workflowReviews?.enabled ?? false),
	);

	return { isWorkflowReviewsEnabled };
}
