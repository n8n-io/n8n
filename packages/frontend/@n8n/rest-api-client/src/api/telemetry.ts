import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';
import { ITelemetryTrackProperties } from 'n8n-workflow';

export async function identify(
	context: IRestApiContext,
	feTelemetryId: string,
	traits: { instance_id: string; version_cli?: string; user_cloud_id?: string },
	// options?: object,
): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/telemetry/identify', {
		feTelemetryId,
		traits,
		// options,
	});
}

export async function track(
	context: IRestApiContext,
	event: string,
	updatedProperties?: ITelemetryTrackProperties & { version_cli?: string },
	// options?: object,
): Promise<void[]> {
	return await makeRestApiRequest(context, 'POST', '/telemetry/track', {
		event,
		updatedProperties,
		// options,
	});
}

export async function page(
	context: IRestApiContext,
	category: string,
	pageName: string,
	properties: Record<string, unknown> = {},
	// options?: object,
): Promise<void[]> {
	return await makeRestApiRequest(context, 'POST', '/telemetry/page', {
		category,
		pageName,
		properties,
		// options,
	});
}
