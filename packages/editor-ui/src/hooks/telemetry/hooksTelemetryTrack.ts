import { n8nFEHooks_ENABLE_LOGS, n8nFEHooks_ENABLE_TRACKING } from '@/hooks/constants';
import { ITelemetryTrackProperties } from 'n8n-workflow';

export interface TelemetryEventData {
	eventName: string;
	properties?: ITelemetryTrackProperties;
}

export const hooksTelemetryTrack = (eventData: TelemetryEventData) => {
	if (n8nFEHooks_ENABLE_LOGS) {
		console.log(eventData);
	}

	if (n8nFEHooks_ENABLE_TRACKING && window.analytics) {
		window.analytics.track(eventData.eventName, eventData.properties || {});
	}
};
