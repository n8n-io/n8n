import { useTelemetry } from '@/app/composables/useTelemetry';
import { VIEWS } from '@/app/constants';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { defineStore } from 'pinia';
import templateIds from './data/recommendedTemplateIds.json';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import sampleSize from 'lodash/sampleSize';

export const NUMBER_OF_TEMPLATES = 6;

export const useRecommendedTemplatesStore = defineStore('recommendedTemplates', () => {
	const telemetry = useTelemetry();
	const templatesStore = useTemplatesStore();
	const settingsStore = useSettingsStore();
	const nodeTypesStore = useNodeTypesStore();

	const isFeatureEnabled = () => {
		return settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost;
	};

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
