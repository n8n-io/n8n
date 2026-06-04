import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export type OtelSettingsResponse = {
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

export async function getOtelSettings(context: IRestApiContext): Promise<OtelSettingsResponse> {
	return await makeRestApiRequest(context, 'GET', '/otel/settings');
}

export async function updateOtelSettings(
	context: IRestApiContext,
	settings: OtelSettingsResponse,
): Promise<OtelSettingsResponse> {
	return await makeRestApiRequest(context, 'PUT', '/otel/settings', settings);
}
