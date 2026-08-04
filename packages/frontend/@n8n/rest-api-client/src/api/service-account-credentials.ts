import type {
	CreateServiceAccountCredentialRequestDto,
	ServiceAccountCredential,
	ServiceAccountCredentialWithSecret,
} from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getServiceAccountCredentials(
	context: IRestApiContext,
	userId?: string,
): Promise<ServiceAccountCredential[]> {
	return await makeRestApiRequest(
		context,
		'GET',
		'/service-account-credentials',
		userId ? { userId } : undefined,
	);
}

export async function createServiceAccountCredential(
	context: IRestApiContext,
	payload: CreateServiceAccountCredentialRequestDto,
): Promise<ServiceAccountCredentialWithSecret> {
	return await makeRestApiRequest(context, 'POST', '/service-account-credentials', payload);
}

export async function deleteServiceAccountCredential(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/service-account-credentials/${id}`);
}
