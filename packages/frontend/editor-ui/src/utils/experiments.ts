import { useTelemetry } from '@/composables/useTelemetry';
import { EXTRA_TEMPLATE_LINKS_EXPERIMENT, TEMPLATE_ONBOARDING_EXPERIMENT } from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { usePostHog } from '@/stores/posthog.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';

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
		active_workflow_count: useWorkflowsStore().activeWorkflows.length,
		source,
	});
};

/*
 * Personalized templates
 */

export const isPersonalizedTemplatesExperimentEnabled = () => {
	return (
		usePostHog().getVariant(TEMPLATE_ONBOARDING_EXPERIMENT.name) ===
			TEMPLATE_ONBOARDING_EXPERIMENT.variantSuggestedTemplates && useCloudPlanStore().userIsTrialing
	);
};

export const getUserSkillCount = () => {
	return 1;
};

const SIMPLE_TEMPLATES = [6035, 1960, 2178];

const PREDEFINED_TEMPLATES_BY_NODE = {
	googleSheets: [5694, 5690, 5906],
	gmail: [5678, 4722, 5694],
	telegram: [5626, 5784, 4875],
	openAi: [2462, 2722, 2178],
	googleGemini: [5993, 6035, 5677],
	googleCalendar: [2328, 3393, 3657],
	youTube: [3188, 4846, 4506],
	airtable: [3053, 2700, 2579],
};

export function getPredefinedFromSelected(selectedApps: string[]) {
	const predefinedNodes = Object.keys(PREDEFINED_TEMPLATES_BY_NODE);
	const predefinedSelected = predefinedNodes.filter((node) => selectedApps.includes(node));

	return predefinedSelected.reduce<number[]>(
		(acc, app) => [
			...acc,
			...PREDEFINED_TEMPLATES_BY_NODE[app as keyof typeof PREDEFINED_TEMPLATES_BY_NODE],
		],
		[],
	);
}

export function getSuggestedTemplatesForLowCodingSkill(selectedApps: string[]) {
	if (selectedApps.length === 0) {
		return SIMPLE_TEMPLATES;
	}

	const predefinedSelected = getPredefinedFromSelected(selectedApps);
	if (predefinedSelected.length > 0) {
		return predefinedSelected;
	}

	return [];
}

export function getTop3Templates(templates: ITemplatesWorkflowFull[]) {
	if (templates.length <= 3) {
		return templates;
	}

	return Array.from(new Map(templates.map((t) => [t.id, t])).values())
		.sort((a, b) => a.totalViews - b.totalViews)
		.slice(0, 3);
}
