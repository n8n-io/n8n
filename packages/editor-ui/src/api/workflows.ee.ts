import {
	IRestApiContext,
	IShareWorkflowsPayload,
	IWorkflowsShareResponse,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import {
	IDataObject,
} from 'n8n-workflow';

export async function setWorkflowSharedWith(context: IRestApiContext, id: string, data: IShareWorkflowsPayload): Promise<IWorkflowsShareResponse> {
	return makeRestApiRequest(context, 'PUT', `/workflows/${id}/share`, data as unknown as IDataObject);
}
