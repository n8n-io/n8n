import type { TeamsAgentSetupState, TeamsDiscoveryState } from '@n8n/api-types';
import { getBrowserId } from '@n8n/constants';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/teams`;

export const getTeamsSetupState = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TeamsAgentSetupState> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/setup`);

/** Opens the window in which the endpoint will record the bot behind an activity. */
export const startTeamsDiscovery = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TeamsDiscoveryState> =>
	await makeRestApiRequest(context, 'POST', `${integrationPath(projectId, agentId)}/discovery`);

export const getTeamsDiscovery = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TeamsDiscoveryState> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/discovery`);

export const stopTeamsDiscovery = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TeamsDiscoveryState> =>
	await makeRestApiRequest(context, 'DELETE', `${integrationPath(projectId, agentId)}/discovery`);

/**
 * Fetched rather than linked to. The session cookie is bound to a `browser-id`
 * header, which a plain navigation cannot send: the request comes back 401 and
 * the app treats that as a dead session and signs the user out.
 */
export const fetchTeamsAppPackage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<Blob> => {
	const response = await fetch(`${context.baseUrl}${integrationPath(projectId, agentId)}/package`, {
		credentials: 'include',
		headers: { 'browser-id': getBrowserId() },
	});
	if (!response.ok) {
		throw new Error(`Could not download the Teams app package (${response.status})`);
	}
	return await response.blob();
};
