import { useTelemetry } from '@/app/composables/useTelemetry';
import { EXTRA_TEMPLATE_LINKS_EXPERIMENT } from '@/app/constants';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';

type ExperimentDefinition = {
	name: string;
};

export const getExperimentTelemetryPayload = (
	experiment: ExperimentDefinition,
	variant: FeatureFlags[keyof FeatureFlags],
	payload: ITelemetryTrackProperties = {},
): ITelemetryTrackProperties => {
	if (typeof variant !== 'string') {
		return payload;
	}

	return {
		...payload,
		variant,
		[`$feature/${experiment.name}`]: variant,
	};
};

/*
 * Extra template links
 */

export const isExtraTemplateLinksExperimentEnabled = () => {
	return (
		usePostHog().getVariant(EXTRA_TEMPLATE_LINKS_EXPERIMENT.name) ===
			EXTRA_TEMPLATE_LINKS_EXPERIMENT.variant && useCloudPlanStore().userIsTrialing
	);
};

export const enum TemplateClickSource {
	emptyWorkflowLink = 'empty_workflow_link',
	emptyInstanceCard = 'empty_instance_card',
	sidebarButton = 'sidebar_button',
	emptyStateBuilderPrompt = 'empty_state_builder_prompt',
	instanceAiSplitEmptyState = 'instance_ai_split_empty_state',
}

export const getTemplatePathByRole = (role: string | null | undefined) => {
	if (!role) {
		return '';
	}

	switch (role) {
		case 'Executive/Owner':
		case 'Product & Design':
			return 'categories/ai/';

		case 'Support':
			return 'categories/support/';

		case 'Sales':
			return 'categories/sales/';

		case 'IT':
		case 'Engineering':
			return 'categories/it-ops/';

		case 'Marketing':
			return 'categories/marketing/';

		case 'Other':
			return 'categories/other/';

		default:
			return '';
	}
};

export const trackTemplatesClick = (source: TemplateClickSource) => {
	useTelemetry().track('User clicked on templates', {
		role: useCloudPlanStore().currentUserCloudInfo?.role,
		active_workflow_count: useWorkflowsListStore().activeWorkflows.length,
		source,
	});
};
