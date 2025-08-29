import type { ICredentialsDecryptedResponse, ICredentialsResponse } from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type {
	ICredentialsDecrypted,
	ICredentialType,
	IDataObject,
	INodeCredentialTestRequest,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import axios from 'axios';
import type { CreateCredentialDto } from '@n8n/api-types';

export async function getCredentialTypes(baseUrl: string): Promise<ICredentialType[]> {
	const { data } = await axios.get(baseUrl + 'types/credentials.json', { withCredentials: true });
	return data;
}

export async function getCredentialsNewName(
	context: IRestApiContext,
	name?: string,
): Promise<{ name: string }> {
	return await makeRestApiRequest(context, 'GET', '/credentials/new', name ? { name } : {});
}

export async function getAllCredentials(
	context: IRestApiContext,
	filter?: object,
	includeScopes?: boolean,
	onlySharedWithMe?: boolean,
): Promise<ICredentialsResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/credentials', {
		...(includeScopes ? { includeScopes } : {}),
		includeData: true,
		...(filter ? { filter } : {}),
		...(onlySharedWithMe ? { onlySharedWithMe } : {}),
	});
}

export async function getAllCredentialsForWorkflow(
	context: IRestApiContext,
	options: { workflowId: string } | { projectId: string },
): Promise<ICredentialsResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/credentials/for-workflow', {
		...options,
	});
}

export async function createNewCredential(
	context: IRestApiContext,
	payload: CreateCredentialDto,
): Promise<ICredentialsResponse> {
	return await makeRestApiRequest(context, 'POST', '/credentials', payload);
}

export async function deleteCredential(context: IRestApiContext, id: string): Promise<boolean> {
	return await makeRestApiRequest(context, 'DELETE', `/credentials/${id}`);
}

export async function updateCredential(
	context: IRestApiContext,
	id: string,
	data: ICredentialsDecrypted,
): Promise<ICredentialsResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/credentials/${id}`,
		data as unknown as IDataObject,
	);
}

export async function getCredentialData(
	context: IRestApiContext,
	id: string,
): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined> {
	return await makeRestApiRequest(context, 'GET', `/credentials/${id}`, {
		includeData: true,
	});
}

// Get OAuth1 Authorization URL using the stored credentials
export async function oAuth1CredentialAuthorize(
	context: IRestApiContext,
	data: ICredentialsResponse,
): Promise<string> {
	return await makeRestApiRequest(
		context,
		'GET',
		'/oauth1-credential/auth',
		data as unknown as IDataObject,
	);
}

// Get OAuth2 Authorization URL using the stored credentials
export async function oAuth2CredentialAuthorize(
	context: IRestApiContext,
	data: ICredentialsResponse,
): Promise<string> {
	return await makeRestApiRequest(
		context,
		'GET',
		'/oauth2-credential/auth',
		data as unknown as IDataObject,
	);
}

export async function testCredential(
	context: IRestApiContext,
	data: INodeCredentialTestRequest,
): Promise<INodeCredentialTestResult> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/credentials/test',
		data as unknown as IDataObject,
	);
}
