import type { TransferWorkflowBodyDto } from '@n8n/api-types';
import type { IRestApiContext, IShareWorkflowsPayload, IWorkflowsShareResponse } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IDataObject } from 'n8n-workflow';

export async function setWorkflowSharedWith(
	context: IRestApiContext,
	id: string,
	data: IShareWorkflowsPayload,
): Promise<IWorkflowsShareResponse> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/workflows/${id}/share`,
		data as unknown as IDataObject,
	);
}

export async function moveWorkflowToProject(
	context: IRestApiContext,
	id: string,
	body: TransferWorkflowBodyDto,
): Promise<void> {
	return await makeRestApiRequest(context, 'PUT', `/workflows/${id}/transfer`, body);
}

export async function moveFolderToProject(
	context: IRestApiContext,
	projectId: string,
	folderId: string,
	destinationProjectId: string,
	destinationParentFolderId?: string,
	shareCredentials?: string[],
): Promise<void> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/projects/${projectId}/folders/${folderId}/transfer`,
		{
			destinationProjectId,
			destinationParentFolderId: destinationParentFolderId ?? '0',
			shareCredentials,
		},
	);
}
