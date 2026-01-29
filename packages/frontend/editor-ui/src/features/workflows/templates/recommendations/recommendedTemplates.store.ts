import { useTelemetry } from '@/app/composables/useTelemetry';
import { DYNAMIC_TEMPLATES_EXPERIMENT, VIEWS } from '@/app/constants';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { defineStore } from 'pinia';
import templateIds from './data/recommendedTemplateIds.json';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { usePostHog } from '@/app/stores/posthog.store';
import { useCloudPlanStore } from '@/app/stores/cloudPlan.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { ITemplatesWorkflowFull } from '@n8n/rest-api-client';
import sampleSize from 'lodash/sampleSize';
import {
	getDynamicRecommendedTemplates,
	type DynamicTemplatesParams,
} from './dynamicTemplates.api';

export const NUMBER_OF_TEMPLATES = 6;

export const useRecommendedTemplatesStore = defineStore('recommendedTemplates', () => {
	const telemetry = useTelemetry();
	const templatesStore = useTemplatesStore();
	const settingsStore = useSettingsStore();
	const nodeTypesStore = useNodeTypesStore();
	const posthogStore = usePostHog();
	const rootStore = useRootStore();
	const cloudPlanStore = useCloudPlanStore();

	const isFeatureEnabled = () => {
		return settingsStore.isTemplatesEnabled && !templatesStore.hasCustomTemplatesHost;
	};

	const isDynamicTemplatesEnabled = () => {
		return posthogStore.isVariantEnabled(
			DYNAMIC_TEMPLATES_EXPERIMENT.name,
			DYNAMIC_TEMPLATES_EXPERIMENT.variant,
		);
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

		if (isDynamicTemplatesEnabled()) {
			return await loadDynamicRecommendedTemplates();
		}

		return await loadStaticRecommendedTemplates();
	}

	async function loadStaticRecommendedTemplates(): Promise<ITemplatesWorkflowFull[]> {
		const ids = getRandomTemplateIds();
		const promises = ids.map(async (id) => await getTemplateData(id));
		const results = await Promise.allSettled(promises);
		return results
			.filter(
				(result): result is PromiseFulfilledResult<ITemplatesWorkflowFull | null> =>
					result.status === 'fulfilled' && result.value !== null,
			)
			.map((result) => result.value as ITemplatesWorkflowFull);
	}

	async function loadDynamicRecommendedTemplates(): Promise<ITemplatesWorkflowFull[]> {
		try {
			const params: DynamicTemplatesParams = {};

			if (settingsStore.isCloudDeployment) {
				// Ensure cloud data is loaded before accessing it
				await cloudPlanStore.initialize();

				const cloudUserInfo = cloudPlanStore.currentUserCloudInfo;

				if (cloudUserInfo?.selectedApps?.length) {
					params.selectedApps = cloudUserInfo.selectedApps;
				}

				if (cloudUserInfo?.information) {
					params.cloudInformation = cloudUserInfo.information;
				}
			}

			const response = await getDynamicRecommendedTemplates(rootStore.restApiContext, params);
			return response.templates.map((template) => template.workflow).slice(0, NUMBER_OF_TEMPLATES);
		} catch (error) {
			// Fallback to existing behavior on error
			console.warn('Dynamic templates failed, falling back to static IDs', error);
			return await loadStaticRecommendedTemplates();
		}
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
