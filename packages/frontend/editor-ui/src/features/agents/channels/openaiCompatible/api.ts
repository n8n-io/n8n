import type { AgentGenerateChannelKeyResponse } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string, type: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/${type}`;

export const generateOpenAiCompatibleKey = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
): Promise<AgentGenerateChannelKeyResponse> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId, type)}/generate-key`,
	);

export const regenerateOpenAiCompatibleKey = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
): Promise<AgentGenerateChannelKeyResponse> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId, type)}/regenerate-key`,
	);
