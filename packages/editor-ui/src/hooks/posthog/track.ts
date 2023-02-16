import { TelemetryEventData } from '@/hooks/types';
import { hooksPosthogLog } from '@/hooks/posthog/log';

export function hooksPosthogTrack(eventData: TelemetryEventData) {
	if (!window.posthog) {
		return;
	}

	hooksPosthogLog('track', { isMethod: true });

	window.posthog.capture(eventData.eventName, eventData.properties);
}
