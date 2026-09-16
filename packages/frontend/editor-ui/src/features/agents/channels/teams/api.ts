import type {
	AgentTeamsIntegrationSettings,
	TeamsAgentSetupState,
	TeamsCredentialCheck,
} from '@n8n/api-types';
import { getBrowserId } from '@n8n/constants';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/teams`;

/**
 * `credentialId` is the credential picked in the setup but not yet connected to
 * the agent. Everything the setup offers is derived from it, and it is not on
 * the agent until the very last step.
 */
export const getTeamsSetupState = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId?: string,
): Promise<TeamsAgentSetupState> =>
	await makeRestApiRequest(
		context,
		'GET',
		`${integrationPath(projectId, agentId)}/setup`,
		credentialId ? { credentialId } : undefined,
	);

export const checkTeamsCredential = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<TeamsCredentialCheck> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/check/${credentialId}`,
	);

/**
 * Fetched rather than linked to. The session cookie is bound to a `browser-id`
 * header, which a plain navigation cannot send: the request comes back 401 and
 * the app treats that as a dead session and signs the user out.
 *
 * `settings` are the ones in the open form rather than the stored ones, because
 * the package is downloaded before the channel is connected.
 */
export const fetchTeamsAppPackage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId?: string,
	settings?: AgentTeamsIntegrationSettings,
): Promise<Blob> => {
	const response = await fetch(`${context.baseUrl}${integrationPath(projectId, agentId)}/package`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'browser-id': getBrowserId(), 'Content-Type': 'application/json' },
		body: JSON.stringify({ credentialId, settings }),
	});
	if (!response.ok) {
		throw new Error(`Could not download the Teams app package (${response.status})`);
	}
	return await response.blob();
};
