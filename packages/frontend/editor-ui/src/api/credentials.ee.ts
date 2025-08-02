import type { ICredentialsResponse, IShareCredentialsPayload } from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IDataObject } from 'n8n-workflow';

export async function setCredentialSharedWith(
	context: IRestApiContext,
	id: string,
	data: IShareCredentialsPayload,
): Promise<ICredentialsResponse> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`/credentials/${id}/share`,
		data as unknown as IDataObject,
	);
}

export async function moveCredentialToProject(
	context: IRestApiContext,
	id: string,
	destinationProjectId: string,
): Promise<void> {
	return await makeRestApiRequest(context, 'PUT', `/credentials/${id}/transfer`, {
		destinationProjectId,
	});
}
