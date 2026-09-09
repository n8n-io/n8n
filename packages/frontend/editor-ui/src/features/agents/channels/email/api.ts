import type { AgentEmailProvisionResponse } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export const provisionAgentEmail = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentEmailProvisionResponse> =>
	await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/email/provision`,
	);
