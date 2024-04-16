import type { CurrentUserResponse, IRestApiContext, SecurityKey } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getMfaQR(
	context: IRestApiContext,
): Promise<{ qrCode: string; secret: string; recoveryCodes: string[] }> {
	return await makeRestApiRequest(context, 'GET', '/mfa/qr');
}

export async function enableMfa(context: IRestApiContext, data: { token: string }): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/mfa/enable', data);
}

export async function verifyMfaToken(
	context: IRestApiContext,
	data: { token: string },
): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/mfa/verify', data);
}

export async function disableMfa(context: IRestApiContext): Promise<void> {
	return await makeRestApiRequest(context, 'DELETE', '/mfa/disable');
}

export async function getChallenge(context: IRestApiContext): Promise<void> {
	return await makeRestApiRequest(context, 'GET', '/mfa/challenge');
}

export async function registerDevice(context: IRestApiContext, data: any): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/mfa/verify-challenge', data);
}

export async function startAuthentication(context: IRestApiContext): Promise<void> {
	return await makeRestApiRequest(context, 'GET', '/mfa/start-authentication');
}

export async function getSecurityKeys(context: IRestApiContext): Promise<SecurityKey[]> {
	return await makeRestApiRequest(context, 'GET', '/mfa/security-keys');
}

export async function deleteSecurityKey(context: IRestApiContext, id: string): Promise<void> {
	return await makeRestApiRequest(context, 'DELETE', `/mfa/security-keys/${id}`);
}

export async function updateSecurityKeyLabel(
	context: IRestApiContext,
	id: string,
	label: string,
): Promise<void> {
	return await makeRestApiRequest(context, 'PATCH', `/mfa/security-keys/${id}`, { label });
}

export async function verifyAuthentication(
	context: IRestApiContext,
	data: any,
): Promise<CurrentUserResponse | null> {
	return await makeRestApiRequest(context, 'POST', '/mfa//verify-authentication', data);
}
