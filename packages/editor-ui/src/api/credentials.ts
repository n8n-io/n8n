import type {
	ICredentialsDecryptedResponse,
	ICredentialsResponse,
	IRestApiContext,
} from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type {
	ICredentialsDecrypted,
	ICredentialType,
	IDataObject,
	INodeCredentialTestRequest,
	INodeCredentialTestResult,
} from 'n8n-workflow';
import axios from 'axios';

export async function getCredentialTypes(baseUrl: string): Promise<ICredentialType[]> {
	const { data } = await axios.get(baseUrl + 'types/credentials.json', { withCredentials: true });
	return data;
}

export async function getCredentialsNewName(
	context: IRestApiContext,
	name?: string,
): Promise<{ name: string }> {
	return makeRestApiRequest(context, 'GET', '/credentials/new', name ? { name } : {});
}

export async function getAllCredentials(context: IRestApiContext): Promise<ICredentialsResponse[]> {
	return makeRestApiRequest(context, 'GET', '/credentials');
}

export async function createNewCredential(
	context: IRestApiContext,
	data: ICredentialsDecrypted,
): Promise<ICredentialsResponse> {
	return makeRestApiRequest(context, 'POST', '/credentials', data as unknown as IDataObject);
}

export async function deleteCredential(context: IRestApiContext, id: string): Promise<boolean> {
	return makeRestApiRequest(context, 'DELETE', `/credentials/${id}`);
}

export async function updateCredential(
	context: IRestApiContext,
	id: string,
	data: ICredentialsDecrypted,
): Promise<ICredentialsResponse> {
	return makeRestApiRequest(context, 'PATCH', `/credentials/${id}`, data as unknown as IDataObject);
}

export async function getCredentialData(
	context: IRestApiContext,
	id: string,
): Promise<ICredentialsDecryptedResponse | ICredentialsResponse | undefined> {
	return makeRestApiRequest(context, 'GET', `/credentials/${id}`, {
		includeData: true,
	});
}

// Get OAuth1 Authorization URL using the stored credentials
export async function oAuth1CredentialAuthorize(
	context: IRestApiContext,
	data: ICredentialsResponse,
): Promise<string> {
	return makeRestApiRequest(
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
	return makeRestApiRequest(
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
	return makeRestApiRequest(context, 'POST', '/credentials/test', data as unknown as IDataObject);
}
