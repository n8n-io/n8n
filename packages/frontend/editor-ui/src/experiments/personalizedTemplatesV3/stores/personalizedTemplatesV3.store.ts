import { useTelemetry } from '@/composables/useTelemetry';
import { PERSONALIZED_TEMPLATES_V3, VIEWS } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { usePostHog } from '@/stores/posthog.store';
import { useTemplatesStore } from '@/features/templates/templates.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const usePersonalizedTemplatesV3Store = defineStore(STORES.PERSONALIZED_TEMPLATES_V3, () => {
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const cloudPlanStore = useCloudPlanStore();
	const templatesStore = useTemplatesStore();
	const workflowsStore = useWorkflowsStore();

	const INTERACTION_STORAGE_KEY = 'n8n-personalizedTemplatesV3-hasInteracted';

	const hasInteractedWithTemplateRecommendations = ref(
		localStorage.getItem(INTERACTION_STORAGE_KEY) === 'true',
	);

	const isFeatureEnabled = () => {
		const isLocalhost = window.location.hostname === 'localhost';
		return (
			posthogStore.getVariant(PERSONALIZED_TEMPLATES_V3.name) ===
				PERSONALIZED_TEMPLATES_V3.variant &&
			(isLocalhost || cloudPlanStore.userIsTrialing)
		);
	};

	const hasChosenHubSpot = computed(() => {
		const selectedApps = cloudPlanStore.selectedApps;

		if (!selectedApps?.length) {
			return false;
		}

		return (
			selectedApps.includes('n8n-nodes-base.hubspot') ||
			selectedApps.includes('n8n-nodes-base.hubspotTrigger')
		);
	});

	const shouldShowTemplateTooltip = computed(() => {
		const allWorkflows = workflowsStore.allWorkflows;

		return (
			isFeatureEnabled() &&
			hasChosenHubSpot.value &&
			allWorkflows.length > 0 &&
			!hasInteractedWithTemplateRecommendations.value
		);
	});

	function getHubSpotData() {
		return {
			templates: [8966, 8967, 8968, 8969, 8970, 8971],
		};
	}

	async function getTemplateData(templateId: number) {
		return await templatesStore.fetchTemplateById(templateId.toString());
	}

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } };
	}

	function trackPersonalizationCardClick() {
		telemetry.track('User clicked on personalization card');
	}

	function trackPersonalizationModalView() {
		telemetry.track('User viewed personalization modal');
	}

	function trackPersonalizationTooltipView() {
		telemetry.track('User viewed personalization tooltip');
	}

	function trackPersonalizationTooltipDismiss() {
		telemetry.track('User dismissed personalization tooltip');
	}

	function trackTemplateClickFromModal(templateId: number) {
		telemetry.track('User clicked on template from modal', {
			templateId,
		});
	}

	function trackTemplatesRepoClickFromModal() {
		telemetry.track('User clicked on templates repo from modal');
	}

	function markTemplateRecommendationInteraction() {
		hasInteractedWithTemplateRecommendations.value = true;
		localStorage.setItem(INTERACTION_STORAGE_KEY, 'true');
	}

	return {
		isFeatureEnabled,
		hasChosenHubSpot,
		shouldShowTemplateTooltip,
		getHubSpotData,
		getTemplateData,
		getTemplateRoute,
		trackPersonalizationCardClick,
		trackPersonalizationModalView,
		trackPersonalizationTooltipView,
		trackPersonalizationTooltipDismiss,
		trackTemplateClickFromModal,
		trackTemplatesRepoClickFromModal,
		markTemplateRecommendationInteraction,
	};
});
