import { IInviteResponse, IPersonalizationLatestVersion, IRestApiContext, IUserResponse } from '@/Interface';
import { IDataObject } from 'n8n-workflow';
import { makeRestApiRequest } from '@/utils';

export function loginCurrentUser(context: IRestApiContext): Promise<IUserResponse | null> {
	return makeRestApiRequest(context, 'GET', '/login');
}

export function getCurrentUser(context: IRestApiContext): Promise<IUserResponse | null> {
	return makeRestApiRequest(context, 'GET', '/me');
}

export function login(context: IRestApiContext, params: {email: string, password: string}): Promise<IUserResponse> {
	return makeRestApiRequest(context, 'POST', '/login', params);
}

export async function logout(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/logout');
}

export function setupOwner(context: IRestApiContext, params: { firstName: string; lastName: string; email: string; password: string;}): Promise<IUserResponse> {
	return makeRestApiRequest(context, 'POST', '/owner', params as unknown as IDataObject);
}

export function skipOwnerSetup(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/owner/skip-setup');
}

export function validateSignupToken(context: IRestApiContext, params: {inviterId: string; inviteeId: string}): Promise<{inviter: {firstName: string, lastName: string}}> {
	return makeRestApiRequest(context, 'GET', '/resolve-signup-token', params);
}

export function signup(context: IRestApiContext, params:  {inviterId: string; inviteeId: string; firstName: string; lastName: string; password: string}): Promise<IUserResponse> {
	const { inviteeId, ...props } = params;
	return makeRestApiRequest(context, 'POST', `/users/${params.inviteeId}`, props as unknown as IDataObject);
}

export async function sendForgotPasswordEmail(context: IRestApiContext, params: {email: string}): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/forgot-password', params);
}

export async function validatePasswordToken(context: IRestApiContext, params: {token: string, userId: string}): Promise<void> {
	await makeRestApiRequest(context, 'GET', '/resolve-password-token', params);
}

export async function changePassword(context: IRestApiContext, params: {token: string, password: string, userId: string}): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/change-password', params);
}

export function updateCurrentUser(context: IRestApiContext, params: {id: string, firstName: string, lastName: string, email: string}): Promise<IUserResponse> {
	return makeRestApiRequest(context, 'PATCH', `/me`, params as unknown as IDataObject);
}

export function updateCurrentUserPassword(context: IRestApiContext, params: {newPassword: string, currentPassword: string}): Promise<void> {
	return makeRestApiRequest(context, 'PATCH', `/me/password`, params);
}

export async function deleteUser(context: IRestApiContext, {id, transferId}: {id: string, transferId?: string}): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/users/${id}`, transferId ? { transferId } : {});
}

export function getUsers(context: IRestApiContext): Promise<IUserResponse[]> {
	return makeRestApiRequest(context, 'GET', '/users');
}

export function inviteUsers(context: IRestApiContext, params: Array<{email: string}>): Promise<IInviteResponse[]> {
	return makeRestApiRequest(context, 'POST', '/users', params as unknown as IDataObject);
}

export async function reinvite(context: IRestApiContext, {id}: {id: string}): Promise<void> {
	await makeRestApiRequest(context, 'POST', `/users/${id}/reinvite`);
}

export async function submitPersonalizationSurvey(context: IRestApiContext, params: IPersonalizationLatestVersion): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/me/survey', params as unknown as IDataObject);
}
