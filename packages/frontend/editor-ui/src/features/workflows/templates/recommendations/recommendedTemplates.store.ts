import { useTelemetry } from '@/app/composables/useTelemetry';
import { computed } from 'vue';
import { EMPTY_STATE_EXPERIMENT, VIEWS } from '@/app/constants';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { defineStore } from 'pinia';
import { usePostHog } from '@/app/stores/posthog.store';
import templateIds from './data/recommendedTemplateIds.json';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import sampleSize from 'lodash/sampleSize';
import { getDynamicRecommendedTemplates } from './dynamicTemplates.api';

export const NUMBER_OF_TEMPLATES = 6;

export const useRecommendedTemplatesStore = defineStore('recommendedTemplates', () => {
	const telemetry = useTelemetry();
	const templatesStore = useTemplatesStore();
	const settingsStore = useSettingsStore();
	const nodeTypesStore = useNodeTypesStore();
	const posthogStore = usePostHog();
	const rootStore = useRootStore();

	const isFeatureEnabled = computed(() => {
		const emptyStateVariant = posthogStore.getVariant(EMPTY_STATE_EXPERIMENT.name);
		const isTemplatesVariant = emptyStateVariant === EMPTY_STATE_EXPERIMENT.variantTemplates;
		return (
			settingsStore.isTemplatesEnabled &&
			!templatesStore.hasCustomTemplatesHost &&
			isTemplatesVariant
		);
	});

	async function getTemplateData(templateId: number): Promise<ITemplatesWorkflowFull | null> {
		return await templatesStore.fetchTemplateById(templateId.toString());
	}

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } } as const;
	}

	function getRandomTemplateIds(): number[] {
		const count = Math.min(NUMBER_OF_TEMPLATES, templateIds.length);
		return sampleSize(templateIds, count);
	}

	function trackTemplateTileClick(templateId: number) {
		telemetry.track('User viewed template detail', {
			templateId,
		});
	}

	function trackTemplateShown(templateId: number, tileNumber: number) {
		telemetry.track('User viewed template cell', {
			tileNumber,
			templateId,
		});
	}

	async function loadRecommendedTemplates(): Promise<ITemplatesWorkflowFull[]> {
		await nodeTypesStore.loadNodeTypesIfNotLoaded();

		// Always try dynamic templates first, fallback to static on error
		try {
			const response = await getDynamicRecommendedTemplates(rootStore.restApiContext);
			return response.templates.map((template) => template.workflow).slice(0, NUMBER_OF_TEMPLATES);
		} catch (error) {
			console.warn('Dynamic templates failed, falling back to static IDs', error);
		}

		// Fallback to static template IDs
		const ids = getRandomTemplateIds();
		const promises = ids.map(async (id) => await getTemplateData(id));
		const results = await Promise.allSettled(promises);

		const templates = results
			.filter(
				(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull | null> =>
					result.status === 'fulfilled' && result.value !== null,
			)
			.map((result) => result.value as ITemplatesWorkflowFull);
		return templates;
	}
	return {
		isFeatureEnabled,
		getRandomTemplateIds,
		getTemplateData,
		getTemplateRoute,
		trackTemplateTileClick,
		trackTemplateShown,
		loadRecommendedTemplates,
	};
});
