import type {
	CurrentUserResponse,
	IInviteResponse,
	IPersonalizationLatestVersion,
	IRestApiContext,
	IUserResponse,
} from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function loginCurrentUser(
	context: IRestApiContext,
): Promise<CurrentUserResponse | null> {
	return makeRestApiRequest(context, 'GET', '/login');
}

export async function login(
	context: IRestApiContext,
	params: { email: string; password: string },
): Promise<CurrentUserResponse> {
	return makeRestApiRequest(context, 'POST', '/login', params);
}

export async function logout(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/logout');
}

export async function preOwnerSetup(
	context: IRestApiContext,
): Promise<{ credentials: number; workflows: number }> {
	return makeRestApiRequest(context, 'GET', '/owner/pre-setup');
}

export async function setupOwner(
	context: IRestApiContext,
	params: { firstName: string; lastName: string; email: string; password: string },
): Promise<IUserResponse> {
	return makeRestApiRequest(context, 'POST', '/owner/setup', params as unknown as IDataObject);
}

export async function skipOwnerSetup(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/owner/skip-setup');
}

export async function validateSignupToken(
	context: IRestApiContext,
	params: { inviterId: string; inviteeId: string },
): Promise<{ inviter: { firstName: string; lastName: string } }> {
	return makeRestApiRequest(context, 'GET', '/resolve-signup-token', params);
}

export async function signup(
	context: IRestApiContext,
	params: {
		inviterId: string;
		inviteeId: string;
		firstName: string;
		lastName: string;
		password: string;
	},
): Promise<CurrentUserResponse> {
	const { inviteeId, ...props } = params;
	return makeRestApiRequest(
		context,
		'POST',
		`/users/${params.inviteeId}`,
		props as unknown as IDataObject,
	);
}

export async function sendForgotPasswordEmail(
	context: IRestApiContext,
	params: { email: string },
): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/forgot-password', params);
}

export async function validatePasswordToken(
	context: IRestApiContext,
	params: { token: string; userId: string },
): Promise<void> {
	await makeRestApiRequest(context, 'GET', '/resolve-password-token', params);
}

export async function changePassword(
	context: IRestApiContext,
	params: { token: string; password: string; userId: string },
): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/change-password', params);
}

export async function updateCurrentUser(
	context: IRestApiContext,
	params: {
		id?: string;
		firstName?: string;
		lastName?: string;
		email: string;
	},
): Promise<IUserResponse> {
	return makeRestApiRequest(context, 'PATCH', '/me', params as unknown as IDataObject);
}

export async function updateCurrentUserSettings(
	context: IRestApiContext,
	settings: IUserResponse['settings'],
): Promise<IUserResponse['settings']> {
	return makeRestApiRequest(context, 'PATCH', '/me/settings', settings);
}

export async function updateCurrentUserPassword(
	context: IRestApiContext,
	params: { newPassword: string; currentPassword: string },
): Promise<void> {
	return makeRestApiRequest(context, 'PATCH', '/me/password', params);
}

export async function deleteUser(
	context: IRestApiContext,
	{ id, transferId }: { id: string; transferId?: string },
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/users/${id}`, transferId ? { transferId } : {});
}

export async function getUsers(context: IRestApiContext): Promise<IUserResponse[]> {
	return makeRestApiRequest(context, 'GET', '/users');
}

export async function inviteUsers(
	context: IRestApiContext,
	params: Array<{ email: string }>,
): Promise<IInviteResponse[]> {
	return makeRestApiRequest(context, 'POST', '/users', params as unknown as IDataObject);
}

export async function reinvite(context: IRestApiContext, { id }: { id: string }): Promise<void> {
	await makeRestApiRequest(context, 'POST', `/users/${id}/reinvite`);
}

export async function getInviteLink(
	context: IRestApiContext,
	{ id }: { id: string },
): Promise<{ link: string }> {
	return makeRestApiRequest(context, 'GET', `/users/${id}/invite-link`);
}

export async function submitPersonalizationSurvey(
	context: IRestApiContext,
	params: IPersonalizationLatestVersion,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/me/survey', params as unknown as IDataObject);
}
