import {
	ICredentialsResponse,
	IRestApiContext,
	IShareCredentialsPayload,
} from '@/Interface';
import { makeRestApiRequest } from './helpers';
import {
	IDataObject,
} from 'n8n-workflow';

export async function addCredentialSharee(context: IRestApiContext, id: string, data: IShareCredentialsPayload): Promise<ICredentialsResponse> {
	return makeRestApiRequest(context, 'POST', `/credentials/${id}/share`, data as unknown as IDataObject);
}

export async function removeCredentialSharee(context: IRestApiContext, id: string, data: IShareCredentialsPayload): Promise<boolean> {
	return makeRestApiRequest(context, 'DELETE', `/credentials/${id}/share`, data as unknown as IDataObject);
}
