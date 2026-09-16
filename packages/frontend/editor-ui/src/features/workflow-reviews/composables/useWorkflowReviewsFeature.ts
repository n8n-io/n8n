import { computed } from 'vue';

import { EnterpriseEditionFeature } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSelfHealingStore } from '@/features/self-healing/selfHealing.store';

export const useWorkflowReviewsFeature = () => {
	const settingsStore = useSettingsStore();
	const selfHealingStore = useSelfHealingStore();

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

	/**
	 * Whether the review inbox (route and nav item) is reachable. The
	 * self-healing prototype serves mocked reviews into the inbox, so it opens
	 * the inbox even when the backend feature is off.
	 */
	const isReviewInboxEnabled = computed(
		() => isWorkflowReviewsEnabled.value || selfHealingStore.isEnabled,
	);

	return {
		isWorkflowReviewsAvailable,
		isWorkflowReviewsEnabled,
		isReviewInboxEnabled,
	};
};
