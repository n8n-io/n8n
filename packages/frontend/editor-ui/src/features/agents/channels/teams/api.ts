import type {
	AgentTeamsIntegrationSettings,
	CreateTeamsManagerCredentialResponse,
	TeamsAgentSetupState,
	TeamsCredentialCheck,
	TeamsAzureSubscription,
	TeamsManagedSetupState,
	TeamsProvisionedAppSummary,
	TeamsProvisionedBotSummary,
} from '@n8n/api-types';
import { getBrowserId } from '@n8n/constants';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/teams`;

/** `credentialId` is the one picked in the setup, before it is on the agent. */
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

export const getTeamsManagedSetup = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TeamsManagedSetupState> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/managed-setup`);

export const createTeamsManagerCredential = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<CreateTeamsManagerCredentialResponse> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/manager-credential`,
	);

export const provisionTeamsApp = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	managerCredentialId: string,
): Promise<TeamsProvisionedAppSummary> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/provision-app`,
		{
			managerCredentialId,
		},
	);

export const getTeamsAzureSubscriptions = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	managerCredentialId: string,
): Promise<TeamsAzureSubscription[]> =>
	await makeRestApiRequest(
		context,
		'GET',
		`${integrationPath(projectId, agentId)}/azure-subscriptions`,
		{ managerCredentialId },
	);

export const provisionTeamsBot = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: {
		managerCredentialId: string;
		credentialId: string;
		subscriptionId: string;
	},
): Promise<TeamsProvisionedBotSummary> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/provision-bot`,
		payload,
	);

/**
 * Asks Microsoft whether the user has the app, for an upload n8n did not
 * perform and so cannot otherwise see.
 */
export const checkTeamsAppInstalled = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: { managerCredentialId: string },
): Promise<{ installed: boolean }> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/installed-check`,
		payload,
	);
