import type { TeamsAgentSetupState, TeamsDiscoveryState } from '@n8n/api-types';
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
 * The package is a binary the browser saves rather than JSON the app parses, so
 * it is reached by navigation. The session cookie authenticates it.
 */
export const teamsAppPackageUrl = (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): string => `${context.baseUrl}${integrationPath(projectId, agentId)}/package`;
