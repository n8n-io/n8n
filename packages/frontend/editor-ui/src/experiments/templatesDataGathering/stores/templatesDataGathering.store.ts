import { useTelemetry } from '@/composables/useTelemetry';
import { TEMPLATES_DATA_GATHERING_EXPERIMENT, VIEWS } from '@/constants';
import { usePostHog } from '@/stores/posthog.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { defineStore } from 'pinia';
import templateIds from '../data/templateIds.json';
import { useSettingsStore } from '@/stores/settings.store';

export const useTemplatesDataGatheringStore = defineStore('templatesDataGathering', () => {
	const telemetry = useTelemetry();
	const posthogStore = usePostHog();
	const templatesStore = useTemplatesStore();
	const settingsStore = useSettingsStore();

	const isFeatureEnabled = () => {
		return (
			settingsStore.isTemplatesEnabled &&
			posthogStore.getVariant(TEMPLATES_DATA_GATHERING_EXPERIMENT.name) ===
				TEMPLATES_DATA_GATHERING_EXPERIMENT.variant
		);
	};

	async function getTemplateData(templateId: number) {
		return await templatesStore.fetchTemplateById(templateId.toString());
	}

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } } as const;
	}

	function getRandomTemplateIds(): number[] {
		const ids = templateIds;
		const result: number[] = [];
		const picked = new Set<number>();
		const count = Math.min(6, ids.length);
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
		telemetry.track('User clicked on template recommendation tile', {
			templateId,
		});
	}

	return {
		isFeatureEnabled,
		getRandomTemplateIds,
		getTemplateData,
		getTemplateRoute,
		trackTemplateTileClick,
	};
});
