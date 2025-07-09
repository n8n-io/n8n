import type {
	LoginRequestDto,
	PasswordUpdateRequestDto,
	Role,
	SettingsUpdateRequestDto,
	UsersList,
	UsersListFilterDto,
	UserUpdateRequestDto,
} from '@n8n/api-types';
import type {
	CurrentUserResponse,
	IPersonalizationLatestVersion,
	IUserResponse,
} from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { IDataObject, IUserSettings } from 'n8n-workflow';
import { makeRestApiRequest } from '@n8n/rest-api-client';

export async function loginCurrentUser(
	context: IRestApiContext,
): Promise<CurrentUserResponse | null> {
	return await makeRestApiRequest(context, 'GET', '/login');
}

export async function login(
	context: IRestApiContext,
	params: LoginRequestDto,
): Promise<CurrentUserResponse> {
	return await makeRestApiRequest(context, 'POST', '/login', params);
}

export async function logout(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/logout');
}

export async function setupOwner(
	context: IRestApiContext,
	params: { firstName: string; lastName: string; email: string; password: string },
): Promise<CurrentUserResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		'/owner/setup',
		params as unknown as IDataObject,
	);
}

export async function validateSignupToken(
	context: IRestApiContext,
	params: { inviterId: string; inviteeId: string },
): Promise<{ inviter: { firstName: string; lastName: string } }> {
	return await makeRestApiRequest(context, 'GET', '/resolve-signup-token', params);
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
	return await makeRestApiRequest(
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
	params: { token: string },
): Promise<void> {
	await makeRestApiRequest(context, 'GET', '/resolve-password-token', params);
}

export async function changePassword(
	context: IRestApiContext,
	params: { token: string; password: string; mfaCode?: string },
): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/change-password', params);
}

export async function updateCurrentUser(
	context: IRestApiContext,
	params: UserUpdateRequestDto,
): Promise<IUserResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/me', params);
}

export async function updateCurrentUserSettings(
	context: IRestApiContext,
	settings: SettingsUpdateRequestDto,
): Promise<IUserSettings> {
	return await makeRestApiRequest(context, 'PATCH', '/me/settings', settings);
}

export async function updateOtherUserSettings(
	context: IRestApiContext,
	userId: string,
	settings: SettingsUpdateRequestDto,
): Promise<IUserSettings> {
	return await makeRestApiRequest(context, 'PATCH', `/users/${userId}/settings`, settings);
}

export async function updateCurrentUserPassword(
	context: IRestApiContext,
	params: PasswordUpdateRequestDto,
): Promise<void> {
	return await makeRestApiRequest(context, 'PATCH', '/me/password', params);
}

export async function deleteUser(
	context: IRestApiContext,
	{ id, transferId }: { id: string; transferId?: string },
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/users/${id}`, transferId ? { transferId } : {});
}

export async function getUsers(
	context: IRestApiContext,
	filter?: UsersListFilterDto,
): Promise<UsersList> {
	return await makeRestApiRequest(context, 'GET', '/users', filter);
}

export async function getInviteLink(
	context: IRestApiContext,
	{ id }: { id: string },
): Promise<{ link: string }> {
	return await makeRestApiRequest(context, 'GET', `/users/${id}/invite-link`);
}

export async function getPasswordResetLink(
	context: IRestApiContext,
	{ id }: { id: string },
): Promise<{ link: string }> {
	return await makeRestApiRequest(context, 'GET', `/users/${id}/password-reset-link`);
}

export async function submitPersonalizationSurvey(
	context: IRestApiContext,
	params: IPersonalizationLatestVersion,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/me/survey', params as unknown as IDataObject);
}

export interface UpdateGlobalRolePayload {
	id: string;
	newRoleName: Role;
}

export async function updateGlobalRole(
	context: IRestApiContext,
	{ id, newRoleName }: UpdateGlobalRolePayload,
): Promise<IUserResponse> {
	return await makeRestApiRequest(context, 'PATCH', `/users/${id}/role`, { newRoleName });
}
