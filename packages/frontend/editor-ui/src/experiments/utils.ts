import { useTelemetry } from '@/app/composables/useTelemetry';
import { useTemplatesDataQualityStore } from '@/experiments/templatesDataQuality/stores/templatesDataQuality.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

/*
 * Extra template links
 */

export const isExtraTemplateLinksExperimentEnabled = () => {
	// Experimental feature enabled by default
	return true || useTemplatesDataQualityStore().isFeatureEnabled();
};

export const enum TemplateClickSource {
	emptyWorkflowLink = 'empty_workflow_link',
	emptyInstanceCard = 'empty_instance_card',
	sidebarButton = 'sidebar_button',
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
		active_workflow_count: useWorkflowsStore().activeWorkflows.length,
		source,
	});
};
