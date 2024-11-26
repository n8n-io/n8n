import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';

export async function canEnableMFA(context: IRestApiContext) {
	return await makeRestApiRequest(context, 'POST', '/mfa/can-enable');
}

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

export type DisableMfaParams = {
	token: string;
	recoveryCode: string;
};

export async function disableMfa(context: IRestApiContext, data: DisableMfaParams): Promise<void> {
	return await makeRestApiRequest(context, 'POST', '/mfa/disable', data);
}
