import { ITelemetryTrackProperties } from 'n8n-workflow';
import { n8nFEHooks_ENABLE_LOGS, n8nFEHooks_ENABLE_TRACKING } from '@/hooks/constants';

export const hooksTelemetryPage = (
	category: string,
	name: string,
	properties: ITelemetryTrackProperties = {},
) => {
	if (n8nFEHooks_ENABLE_LOGS) {
		console.log('Analytics.page:', { category, name, properties });
	}
	if (n8nFEHooks_ENABLE_TRACKING && window.analytics) {
		window.analytics.page(category, name, properties);
	}
};
