import type {
	CreateSlackAgentAppResponse,
	CreateSlackManagerCredentialResponse,
	InstallSlackManagedAppResponse,
	SlackAgentAppManifestResponse,
	SlackApiErrorMeta,
	SlackManagedAppSettings,
	SlackManagedSetupState,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest, ResponseError } from '@n8n/rest-api-client';

const integrationPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/integrations/slack`;

function isSlackApiErrorMeta(value: unknown): value is SlackApiErrorMeta {
	return (
		typeof value === 'object' &&
		value !== null &&
		'integrationType' in value &&
		value.integrationType === 'slack' &&
		'code' in value &&
		typeof value.code === 'string'
	);
}

export function getSlackApiErrorCode(error: unknown): string | undefined {
	const meta = error instanceof ResponseError ? error.meta : undefined;
	return isSlackApiErrorMeta(meta) ? meta.code : undefined;
}

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

export const getSlackManagedSetup = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<SlackManagedSetupState> =>
	await makeRestApiRequest(context, 'GET', `${integrationPath(projectId, agentId)}/managed/setup`);

export const createSlackManagerCredential = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<CreateSlackManagerCredentialResponse> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/managed/credentials`,
	);

export const finalizeSlackManagerCredential = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<void> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/managed/credentials/${credentialId}/finalize`,
	);

export const installSlackManagedApp = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	managerCredentialId: string,
	workspaceId: string,
): Promise<InstallSlackManagedAppResponse> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/managed/install`,
		{ managerCredentialId, workspaceId },
	);

export const getSlackManagedAppSettings = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	credentialId: string,
): Promise<SlackManagedAppSettings> =>
	await makeRestApiRequest(
		context,
		'GET',
		`${integrationPath(projectId, agentId)}/managed/settings/${credentialId}`,
	);

export const updateSlackManagedAppSettings = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	settings: Pick<SlackManagedAppSettings, 'credentialId' | 'name' | 'description' | 'alwaysOnline'>,
): Promise<SlackManagedAppSettings> =>
	await makeRestApiRequest(
		context,
		'POST',
		`${integrationPath(projectId, agentId)}/managed/settings`,
		settings,
	);
