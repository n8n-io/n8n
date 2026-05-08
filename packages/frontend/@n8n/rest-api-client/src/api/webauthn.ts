import type { WebAuthnCredentialResponse } from '@n8n/api-types';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

export type WebAuthnAttachment = 'platform' | 'cross-platform';

export async function getRegistrationOptions(
	context: IRestApiContext,
	attachment: WebAuthnAttachment,
) {
	return await makeRestApiRequest(
		context,
		'GET',
		`/mfa/webauthn/registration-options?attachment=${attachment}`,
	);
}

export async function verifyRegistration(
	context: IRestApiContext,
	data: { label: string; response: unknown; attachment: WebAuthnAttachment },
): Promise<{
	id: string;
	credentialId: string;
	label: string;
}> {
	return await makeRestApiRequest(context, 'POST', '/mfa/webauthn/registration-verify', data);
}

export async function getAuthenticationOptions(context: IRestApiContext, email: string) {
	return await makeRestApiRequest(context, 'POST', '/mfa/webauthn/authentication-options', {
		email,
	});
}

export async function getCredentials(
	context: IRestApiContext,
): Promise<WebAuthnCredentialResponse[]> {
	return await makeRestApiRequest(context, 'GET', '/mfa/webauthn/credentials');
}

export async function deleteCredential(context: IRestApiContext, id: string): Promise<void> {
	return await makeRestApiRequest(context, 'DELETE', `/mfa/webauthn/credentials/${id}`);
}

export async function updateCredential(
	context: IRestApiContext,
	id: string,
	data: { label: string },
): Promise<void> {
	return await makeRestApiRequest(context, 'PATCH', `/mfa/webauthn/credentials/${id}`, data);
}
