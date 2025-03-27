import { IHttpRequestOptions } from 'n8n-workflow';

export async function marcarComoPago(
	baseURL: string,
	accessToken: string,
	chargeId: string
): Promise<IHttpRequestOptions> {

	return {
		method: 'PUT',
		url: `${baseURL}/v1/charge/${chargeId}/settle`,
		json: true,
		headers: { Authorization: `Bearer ${accessToken}` },
	};
}
