import type { TransferWorkflowBodyDto } from '@n8n/api-types';
import type { IShareWorkflowsPayload, IWorkflowsShareResponse } from '@/Interface';
import type { IRestApiContext } from '@n8n/api-requests';
import { makeRestApiRequest } from '@n8n/api-requests';
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
