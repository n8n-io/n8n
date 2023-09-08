import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function getMfaQR(
	context: IRestApiContext,
): Promise<{ qrCode: string; secret: string; recoveryCodes: string[] }> {
	return makeRestApiRequest(context, 'GET', '/mfa/qr');
}

export async function enableMfa(context: IRestApiContext, data: { token: string }): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/mfa/enable', data);
}

export async function verifyMfaToken(
	context: IRestApiContext,
	data: { token: string },
): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/mfa/verify', data);
}

export async function disableMfa(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'DELETE', '/mfa/disable');
}
