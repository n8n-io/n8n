import type { ITelemetryTrackProperties } from 'n8n-workflow';

export interface TelemetryEventData {
	eventName: string;
	properties?: ITelemetryTrackProperties;
}
