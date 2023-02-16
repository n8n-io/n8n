import { n8nCloudHooks_ENABLE_LOGS, n8nCloudHooks_ENABLE_TRACKING } from '@/hooks/constants';
import { TelemetryEventData } from '@/hooks/types';

export const hooksTelemetryTrack = (eventData: TelemetryEventData) => {
	if (n8nCloudHooks_ENABLE_LOGS) {
		console.log(eventData);
	}

	if (n8nCloudHooks_ENABLE_TRACKING && window.analytics) {
		window.analytics.track(eventData.eventName, eventData.properties || {});
	}
};
