import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface TelemetryEvent {
	event_name: string;
	properties?: Record<string, any>;
	timestamp: string;
}

export interface TelemetryBatchPayload {
	events: TelemetryEvent[];
}

export async function sendTelemetryEventsBatch(
	context: IRestApiContext,
	payload: TelemetryBatchPayload,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'POST', '/telemetry/events/batch', payload);
}
