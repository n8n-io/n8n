import type { ITelemetryTrackProperties } from 'n8n-workflow/Interfaces';

export interface TelemetryEventData {
	eventName: string;
	properties?: ITelemetryTrackProperties;
}
