import { IRestApiContext} from "@/Interface";
import { makeRestApiRequest } from '@/utils';

export function getMfaQr(context: IRestApiContext): Promise<{ qrCode: string, secret: string }> {
	return makeRestApiRequest(context, 'GET', '/mfa/qr');
}

export function enableMfa(context: IRestApiContext, data: { code: string }): Promise<void> {
	return makeRestApiRequest(context, 'POST', '/mfa/enable', data);
}

export function disableMfa(context: IRestApiContext): Promise<void> {
	return makeRestApiRequest(context, 'DELETE', '/mfa/disable');
}
