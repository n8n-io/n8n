import type { CreateSlackAgentAppResponse, SlackAgentAppManifestResponse } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/slack`;

export const createSlackAgentApp = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	appConfigurationToken: string,
): Promise<CreateSlackAgentAppResponse> =>
	await makeRestApiRequest(context, 'POST', `${integrationPath(projectId, agentId)}/app`, {
		appConfigurationToken,
	});

export const getSlackAgentAppManifest = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<SlackAgentAppManifestResponse> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/manifest`);
