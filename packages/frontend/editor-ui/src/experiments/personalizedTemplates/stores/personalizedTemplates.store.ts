import { useStorage } from '@/composables/useStorage';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	LOCAL_STORAGE_EXPERIMENTAL_DISMISSED_SUGGESTED_WORKFLOWS,
	TEMPLATE_ONBOARDING_EXPERIMENT,
	VIEWS,
} from '@/constants';
import { useCloudPlanStore } from '@/stores/cloudPlan.store';
import { usePostHog } from '@/stores/posthog.store';
import { useTemplatesStore } from '@/features/templates/templates.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { jsonParse } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

const SIMPLE_TEMPLATES = [6270, 5271, 2178];

const PREDEFINED_TEMPLATES_BY_NODE = {
	'n8n-nodes-base.gmail': [5678, 4722, 5694],
	'n8n-nodes-base.googleSheets': [5694, 5690, 5906],
	'n8n-nodes-base.telegram': [5626, 2114, 4875],
	'@n8n/n8n-nodes-langchain.openAi': [2462, 2722, 2178],
	'@n8n/n8n-nodes-langchain.googleGemini': [5993, 6270, 5677],
	'n8n-nodes-base.googleCalendar': [2328, 3393, 2110],
	'n8n-nodes-base.youTube': [3188, 4846, 4506],
	'n8n-nodes-base.airtable': [3053, 2700, 2579],
};

function getPredefinedFromSelected(selectedApps: string[]) {
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

function getSuggestedTemplatesForLowCodingSkill(selectedApps: string[]) {
	if (selectedApps.length === 0) {
		return SIMPLE_TEMPLATES;
	}

	const predefinedSelected = getPredefinedFromSelected(selectedApps);
	if (predefinedSelected.length > 0) {
		return predefinedSelected;
	}

	return [];
}

function keepTop3Templates(templates: ITemplatesWorkflowFull[]) {
	if (templates.length <= 3) {
		return templates;
	}

	return Array.from(new Map(templates.map((t) => [t.id, t])).values())
		.sort((a, b) => b.totalViews - a.totalViews)
		.slice(0, 3);
}

export const usePersonalizedTemplatesStore = defineStore(STORES.PERSONALIZED_TEMPLATES, () => {
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const cloudPlanStore = useCloudPlanStore();
	const templatesStore = useTemplatesStore();

	const allSuggestedWorkflows = ref<ITemplatesWorkflowFull[]>([]);
	const dismissedSuggestedWorkflowsStorage = useStorage(
		LOCAL_STORAGE_EXPERIMENTAL_DISMISSED_SUGGESTED_WORKFLOWS,
	);
	const dismissedSuggestedWorkflows = computed((): number[] => {
		return dismissedSuggestedWorkflowsStorage.value
			? jsonParse(dismissedSuggestedWorkflowsStorage.value, { fallbackValue: [] })
			: [];
	});
	const suggestedWorkflows = computed(() =>
		allSuggestedWorkflows.value.filter(({ id }) => !dismissedSuggestedWorkflows.value.includes(id)),
	);
	const dismissSuggestedWorkflow = (id: number) => {
		dismissedSuggestedWorkflowsStorage.value = JSON.stringify([
			...(dismissedSuggestedWorkflows.value ?? []),
			id,
		]);
	};

	const isFeatureEnabled = () => {
		return (
			posthogStore.getVariant(TEMPLATE_ONBOARDING_EXPERIMENT.name) ===
				TEMPLATE_ONBOARDING_EXPERIMENT.variantSuggestedTemplates && cloudPlanStore.userIsTrialing
		);
	};

	const trackUserWasRecommendedTemplates = (templateIds: number[]) => {
		telemetry.track('User was recommended personalized templates', {
			templateIds,
		});
	};

	const trackUserClickedOnPersonalizedTemplate = (templateId: number) => {
		telemetry.track('User clicked on personalized template callout', {
			templateId,
		});
	};

	const trackUserDismissedCallout = (templateId: number) => {
		telemetry.track('User dismissed personalized template callout', {
			templateId,
		});
	};

	const fetchSuggestedWorkflows = async (codingSkill: number, selectedApps: string[]) => {
		if (!isFeatureEnabled()) {
			return;
		}

		try {
			if (codingSkill === 1) {
				const predefinedSelected = getSuggestedTemplatesForLowCodingSkill(selectedApps);

				if (predefinedSelected.length > 0) {
					const suggestedWorkflowsPromises = predefinedSelected.map(
						async (id) => await templatesStore.fetchTemplateById(id.toString()),
					);

					const allWorkflows = await Promise.all(suggestedWorkflowsPromises);
					const top3Templates = keepTop3Templates(allWorkflows);
					allSuggestedWorkflows.value = top3Templates;
					trackUserWasRecommendedTemplates(top3Templates.map((t) => t.id));
					return;
				}
			}

			const topWorkflowsByApp = await templatesStore.getWorkflows({
				categories: [],
				search: '',
				sort: 'rank:desc',
				nodes: selectedApps.length > 0 ? selectedApps : undefined,
				combineWith: 'or',
			});

			const topWorkflowsIds = topWorkflowsByApp.slice(0, 3).map((workflow) => workflow.id);
			const suggestedWorkflowsPromises = topWorkflowsIds.map(
				async (id) => await templatesStore.fetchTemplateById(id.toString()),
			);

			const allWorkflows = await Promise.all(suggestedWorkflowsPromises);
			const top3Templates = keepTop3Templates(allWorkflows);
			allSuggestedWorkflows.value = top3Templates;
			trackUserWasRecommendedTemplates(top3Templates.map((t) => t.id));
		} catch (error) {
			// Let it fail silently
		}
	};

	const getTemplateRoute = (id: number) => {
		return { name: VIEWS.TEMPLATE, params: { id } };
	};

	watch(
		() => cloudPlanStore.currentUserCloudInfo,
		async (userInfo) => {
			if (!userInfo) return;

			const codingSkill = cloudPlanStore.codingSkill;
			const selectedApps = cloudPlanStore.selectedApps ?? [];

			await fetchSuggestedWorkflows(codingSkill, selectedApps);
		},
	);

	return {
		isFeatureEnabled,
		suggestedWorkflows,
		dismissSuggestedWorkflow,
		trackUserClickedOnPersonalizedTemplate,
		trackUserDismissedCallout,
		getTemplateRoute,
	};
});
