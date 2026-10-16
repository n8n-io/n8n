import type {
	AutomationMapDetail,
	AutomationMapSummary,
	UpdateAutomationMapDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function fetchAutomationMaps(context: IRestApiContext) {
	return await makeRestApiRequest<AutomationMapSummary[]>(context, 'GET', '/automation-maps');
}

export async function createAutomationMap(context: IRestApiContext, prompt: string) {
	return await makeRestApiRequest<AutomationMapSummary>(context, 'POST', '/automation-maps', {
		prompt,
	});
}

export async function fetchAutomationMap(context: IRestApiContext, id: string) {
	return await makeRestApiRequest<AutomationMapDetail>(context, 'GET', `/automation-maps/${id}`);
}

export async function updateAutomationMap(
	context: IRestApiContext,
	id: string,
	update: UpdateAutomationMapDto,
) {
	return await makeRestApiRequest<AutomationMapDetail>(
		context,
		'PATCH',
		`/automation-maps/${id}`,
		update,
	);
}

export async function refreshAutomationMap(context: IRestApiContext, id: string) {
	return await makeRestApiRequest<AutomationMapSummary>(
		context,
		'POST',
		`/automation-maps/${id}/refresh`,
	);
}

export async function deleteAutomationMap(context: IRestApiContext, id: string) {
	await makeRestApiRequest(context, 'DELETE', `/automation-maps/${id}`);
}
