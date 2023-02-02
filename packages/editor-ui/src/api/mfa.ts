import { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';

export function getMfaQr(
	context: IRestApiContext,
): Promise<{ qrCode: string; secret: string; recoveryCodes: string[] }> {
	return makeRestApiRequest(context, 'GET', '/mfa/qr');
}

export function enableMfa(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/mfa/enable');
}

export function verifyMfaToken(context: IRestApiContext, data: { token: string }): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/mfa/verify', data);
}

export function disableMfa(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'DELETE', '/mfa/disable');
}
