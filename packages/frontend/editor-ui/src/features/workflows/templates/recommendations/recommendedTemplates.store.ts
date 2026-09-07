import { useTelemetry } from '@n8n/composables/useTelemetry';
import { VIEWS } from '@/app/constants';
import { defineStore } from 'pinia';

export const useRecommendedTemplatesStore = defineStore('recommendedTemplates', () => {
	const telemetry = useTelemetry();

	function getTemplateRoute(id: number) {
		return { name: VIEWS.TEMPLATE, params: { id } } as const;
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
		getTemplateRoute,
		trackTemplateTileClick,
		trackTemplateShown,
	};
});
