import type { ICredentialsDecryptedResponse, ICredentialsResponse } from './credentials.types';
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
import { sleep } from 'n8n-workflow';
import type { CreateCredentialDto } from '@n8n/api-types';

async function fetchCredentialTypesJsonWithRetry(url: string, retries = 5, delay = 500) {
	for (let attempt = 0; attempt < retries; attempt++) {
		const response = await axios.get(url, { withCredentials: true });

		if (
			typeof response.data === 'object' &&
			response.data !== null &&
			Array.isArray(response.data)
		) {
			return response.data;
		}

		await sleep(delay * attempt);
	}

	throw new Error('Could not fetch credential types');
}

export async function getCredentialTypes(baseUrl: string): Promise<ICredentialType[]> {
	return await fetchCredentialTypesJsonWithRetry(baseUrl + 'types/credentials.json');
}

export async function getCredentialsNewName(
	context: IRestApiContext,
	name?: string,
): Promise<{ name: string }> {
	return await makeRestApiRequest(context, 'GET', '/credentials/new', name ? { name } : {});
}

export interface GetAllCredentialsOptions {
	filter?: object;
	includeScopes?: boolean;
	onlySharedWithMe?: boolean;
	includeGlobal?: boolean;
	/**
	 * The implementation of the externalSecretsStore filter option is not optimized for performance.
	 * Don't expose it via the filter selection component. It shall only be provided when clicking on
	 * the link to jump to this overview from the "Delete secret provider connection" modal.
	 *
	 * See RFC to improve its performance in the future:
	 * https://www.notion.so/n8n/Querying-credential-dependencies-e-g-External-Secret-Store-stored-in-expressions-3035b6e0c94f80e78448ff08e5528c2a
	 */
	externalSecretsStore?: string;
}

export async function getAllCredentials(
	context: IRestApiContext,
	options: GetAllCredentialsOptions = {},
): Promise<ICredentialsResponse[]> {
	const { filter, includeScopes, onlySharedWithMe, includeGlobal, externalSecretsStore } = options;

	return await makeRestApiRequest(context, 'GET', '/credentials', {
		...(includeScopes ? { includeScopes } : {}),
		includeData: true,
		...(filter ? { filter } : {}),
		...(onlySharedWithMe ? { onlySharedWithMe } : {}),
		...(typeof includeGlobal === 'boolean' ? { includeGlobal } : {}),
		...(externalSecretsStore ? { externalSecretsStore } : {}),
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
