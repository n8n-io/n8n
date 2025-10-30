import { useTelemetry } from '@/composables/useTelemetry';
import { TEMPLATES_DATA_QUALITY_EXPERIMENT, VIEWS } from '@/constants';
import { usePostHog } from '@/stores/posthog.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { defineStore } from 'pinia';
import batch1TemplateIds from '../data/batch1TemplateIds.json';
import batch2TemplateIds from '../data/batch2TemplateIds.json';
import { useSettingsStore } from '@/stores/settings.store';

const NUMBER_OF_TEMPLATES = 6;

export const useTemplatesDataQualityStore = defineStore('templatesDataQuality', () => {
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const templatesStore = useTemplatesStore();
	const settingsStore = useSettingsStore();

	const isFeatureEnabled = () => {
		return (
			settingsStore.isTemplatesEnabled &&
			(posthogStore.getVariant(TEMPLATES_DATA_QUALITY_EXPERIMENT.name) ===
				TEMPLATES_DATA_QUALITY_EXPERIMENT.variant1 ||
				posthogStore.getVariant(TEMPLATES_DATA_QUALITY_EXPERIMENT.name) ===
					TEMPLATES_DATA_QUALITY_EXPERIMENT.variant2)
		);
	};

	async function getTemplateData(templateId: number) {
		return await templatesStore.fetchTemplateById(templateId.toString());
	}

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } } as const;
	}

	function getRandomTemplateIds(): number[] {
		const ids =
			posthogStore.getVariant(TEMPLATES_DATA_QUALITY_EXPERIMENT.name) ===
			TEMPLATES_DATA_QUALITY_EXPERIMENT.variant1
				? batch1TemplateIds
				: batch2TemplateIds;
		const result: number[] = [];
		const picked = new Set<number>();
		const count = Math.min(NUMBER_OF_TEMPLATES, ids.length);
		while (result.length < count) {
			const index = Math.floor(Math.random() * ids.length);
			if (!picked.has(index)) {
				picked.add(index);
				result.push(ids[index]);
			}
		}
		return result;
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
	return {
		isFeatureEnabled,
		getRandomTemplateIds,
		getTemplateData,
		getTemplateRoute,
		trackTemplateTileClick,
		trackTemplateShown,
	};
});
