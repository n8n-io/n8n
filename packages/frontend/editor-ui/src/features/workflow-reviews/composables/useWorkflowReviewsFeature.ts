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
	 * Whether the review inbox (route and nav item) is reachable. Mirrors the
	 * module-availability middleware, which the inbox route no longer uses: the
	 * self-healing prototype serves mocked reviews into the inbox, so it opens
	 * the inbox even when the backend module is off.
	 */
	const isReviewInboxEnabled = computed(
		() =>
			(isWorkflowReviewsEnabled.value && settingsStore.isModuleActive('workflow-reviews')) ||
			selfHealingStore.isEnabled,
	);

	return {
		isWorkflowReviewsAvailable,
		isWorkflowReviewsEnabled,
		isReviewInboxEnabled,
	};
};
