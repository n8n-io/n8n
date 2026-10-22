import type {
	AvailableCredentialTypesResponse,
	AvailableTypesResponse,
	CredentialTransferPreview,
	FolderTransferPreview,
	WorkflowTransferPreview,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function fetchAvailableTypes(
	context: IRestApiContext,
	projectId: string,
): Promise<AvailableTypesResponse> {
	return await makeRestApiRequest(context, 'GET', `/projects/${projectId}/available-types`);
}

export async function fetchAvailableCredentialTypes(
	context: IRestApiContext,
	projectId: string,
): Promise<AvailableCredentialTypesResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/available-credential-types`,
	);
}

export async function fetchWorkflowTransferPreview(
	context: IRestApiContext,
	workflowId: string,
	destinationProjectId: string,
): Promise<WorkflowTransferPreview> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${workflowId}/transfer-preview`, {
		destinationProjectId,
	});
}

export async function fetchFolderTransferPreview(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	destinationProjectId: string,
): Promise<FolderTransferPreview> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/projects/${projectId}/folders/${folderId}/transfer-preview`,
		{ destinationProjectId },
	);
}

export async function fetchCredentialTransferPreview(
	context: IRestApiContext,
	credentialId: string,
	destinationProjectId: string,
): Promise<CredentialTransferPreview> {
	return await makeRestApiRequest(context, 'GET', `/credentials/${credentialId}/transfer-preview`, {
		destinationProjectId,
	});
}
