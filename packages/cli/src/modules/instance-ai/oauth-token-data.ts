import { isObjectLiteral } from '@n8n/backend-common';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

export function readOAuthTokenData(
	data: ICredentialDataDecryptedObject,
): Record<string, unknown> | null {
	const tokenData = data.oauthTokenData;
	return isObjectLiteral(tokenData) ? tokenData : null;
}

export function readAccessToken(tokenData: Record<string, unknown>): string | undefined {
	const accessToken = tokenData.accessToken ?? tokenData.access_token;
	return typeof accessToken === 'string' && accessToken.length > 0 ? accessToken : undefined;
}
