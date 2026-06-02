import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export interface OtelHeader {
	key: string;
	value: string;
}

export interface OtelSettings {
	enabled: boolean;
	exporterEndpoint: string;
	exporterTracingPath: string;
	exporterHeaders: OtelHeader[];
	exporterServiceName: string;
	tracesSampleRate: number;
	startupConnectivityTimeoutMs: number;
	includeNodeSpans: boolean;
	injectOutbound: boolean;
	publishedOnly: boolean;
}

export async function getOtelSettings(context: IRestApiContext): Promise<OtelSettings> {
	return await makeRestApiRequest(context, 'GET', '/otel/settings');
}

export async function updateOtelSettings(
	context: IRestApiContext,
	data: Partial<OtelSettings>,
): Promise<OtelSettings> {
	return await makeRestApiRequest(context, 'PATCH', '/otel/settings', data);
}

export async function sendTestTrace(context: IRestApiContext): Promise<{ sentAt: string }> {
	return await makeRestApiRequest(context, 'POST', '/otel/test-trace');
}
