import type { IRestApiContext } from '@n8n/rest-api-client';
import { createInternalApiClient } from '@n8n/rest-api-client';

export type OtelSettings = {
	enabled: boolean;
	exporterEndpoint: string;
	exporterTracingPath: string;
	exporterServiceName: string;
	exporterHeaders: string;
	tracesSampleRate: number;
	startupConnectivityTimeoutMs: number;
	includeNodeSpans: boolean;
	injectOutbound: boolean;
	productionExecutionsOnly: boolean;
};

export type OtelSettingsResponse = OtelSettings & {
	envManagedFields: Array<keyof OtelSettings>;
};

export async function getOtelSettings(context: IRestApiContext): Promise<OtelSettingsResponse> {
	// API-42: call through the generated, type-safe internal client. The response
	// type comes from the backend's @ApiResponse(OtelSettingsResponseDto).
	return await createInternalApiClient(context).otel.getSettings();
}

export async function updateOtelSettings(
	context: IRestApiContext,
	settings: OtelSettings,
): Promise<OtelSettingsResponse> {
	return await createInternalApiClient(context).otel.updateSettings({ body: settings });
}

export type OtelTestConnection = Pick<
	OtelSettings,
	| 'exporterEndpoint'
	| 'exporterTracingPath'
	| 'exporterServiceName'
	| 'exporterHeaders'
	| 'startupConnectivityTimeoutMs'
>;

export type OtelTestTraceResponse = { success: true } | { success: false; error: string };

export async function sendOtelTestTrace(
	context: IRestApiContext,
	connection: OtelTestConnection,
): Promise<OtelTestTraceResponse> {
	return await createInternalApiClient(context).otel.testTrace({ body: connection });
}
