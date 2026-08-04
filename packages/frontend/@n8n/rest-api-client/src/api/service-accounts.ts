import type {
	ImpersonationActor,
	ServiceAccount,
	ServiceAccountsList,
	UsersListFilterDto,
} from '@n8n/api-types';

import type { CurrentUserResponse } from './users';
import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export async function getServiceAccounts(
	context: IRestApiContext,
	filter?: UsersListFilterDto,
): Promise<ServiceAccountsList> {
	return await makeRestApiRequest(context, 'GET', '/service-accounts', filter);
}

export async function createServiceAccount(
	context: IRestApiContext,
	payload: { name: string; role?: string },
): Promise<ServiceAccount> {
	return await makeRestApiRequest(context, 'POST', '/service-accounts', payload);
}

export async function updateServiceAccount(
	context: IRestApiContext,
	id: string,
	payload: { name?: string; disabled?: boolean },
): Promise<ServiceAccount> {
	return await makeRestApiRequest(context, 'PATCH', `/service-accounts/${id}`, payload);
}

export async function changeServiceAccountRole(
	context: IRestApiContext,
	id: string,
	newRoleName: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'PATCH', `/service-accounts/${id}/role`, {
		newRoleName,
	});
}

export async function deleteServiceAccount(
	context: IRestApiContext,
	id: string,
): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', `/service-accounts/${id}`);
}

/**
 * Start acting as a service account. The response describes the **service
 * account** — from here on it is the principal for every request — with the
 * human recorded as `actor`.
 */
export async function startImpersonation(
	context: IRestApiContext,
	serviceAccountId: string,
): Promise<CurrentUserResponse> {
	return await makeRestApiRequest(context, 'POST', '/impersonation', { serviceAccountId });
}

/** Stop acting as a service account and restore the operator's session. */
export async function stopImpersonation(
	context: IRestApiContext,
): Promise<CurrentUserResponse & { actor?: ImpersonationActor }> {
	return await makeRestApiRequest(context, 'DELETE', '/impersonation');
}
