import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type {
	ConnectionPushResult,
	ConnectionStatus,
	CreateConnectionPayload,
	SourceControlConnectionDto,
	SourceControlScopeType,
	UpdateConnectionPayload,
} from './sourceControlConnections.types';

const apiRoot = '/source-control/connections';

export const getConnections = async (
	context: IRestApiContext,
): Promise<SourceControlConnectionDto[]> => {
	return await makeRestApiRequest(context, 'GET', apiRoot);
};

export const createConnection = async (
	context: IRestApiContext,
	payload: CreateConnectionPayload,
): Promise<SourceControlConnectionDto> => {
	return await makeRestApiRequest(context, 'POST', apiRoot, payload);
};

export const updateConnection = async (
	context: IRestApiContext,
	connectionId: string,
	payload: UpdateConnectionPayload,
): Promise<SourceControlConnectionDto> => {
	return await makeRestApiRequest(context, 'PATCH', `${apiRoot}/${connectionId}`, payload);
};

export const deleteConnection = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `${apiRoot}/${connectionId}`);
};

export const connect = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<SourceControlConnectionDto> => {
	return await makeRestApiRequest(context, 'POST', `${apiRoot}/${connectionId}/connect`);
};

export const disconnect = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<SourceControlConnectionDto> => {
	return await makeRestApiRequest(context, 'POST', `${apiRoot}/${connectionId}/disconnect`);
};

export const generateKeyPair = async (
	context: IRestApiContext,
	connectionId: string,
	keyGeneratorType?: 'ed25519' | 'rsa',
): Promise<SourceControlConnectionDto> => {
	return await makeRestApiRequest(context, 'POST', `${apiRoot}/${connectionId}/generate-key-pair`, {
		keyGeneratorType,
	});
};

export const getBranches = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<{ branches: string[]; currentBranch: string }> => {
	return await makeRestApiRequest(context, 'GET', `${apiRoot}/${connectionId}/branches`);
};

export const claimScope = async (
	context: IRestApiContext,
	connectionId: string,
	payload: { scopeType: SourceControlScopeType; projectId?: string },
): Promise<void> => {
	await makeRestApiRequest(context, 'POST', `${apiRoot}/${connectionId}/scopes`, payload);
};

export const unclaimProject = async (
	context: IRestApiContext,
	connectionId: string,
	projectId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`${apiRoot}/${connectionId}/scopes/project/${projectId}`,
	);
};

export const removeInstanceScope = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `${apiRoot}/${connectionId}/scopes/instance`);
};

export const getStatus = async (
	context: IRestApiContext,
	connectionId: string,
): Promise<ConnectionStatus> => {
	return await makeRestApiRequest(context, 'GET', `${apiRoot}/${connectionId}/status`);
};

export const push = async (
	context: IRestApiContext,
	connectionId: string,
	commitMessage: string,
): Promise<ConnectionPushResult> => {
	return await makeRestApiRequest(context, 'POST', `${apiRoot}/${connectionId}/push`, {
		commitMessage,
	});
};

export const pull = async (context: IRestApiContext, connectionId: string): Promise<unknown> => {
	return await makeRestApiRequest(context, 'POST', `${apiRoot}/${connectionId}/pull`);
};
