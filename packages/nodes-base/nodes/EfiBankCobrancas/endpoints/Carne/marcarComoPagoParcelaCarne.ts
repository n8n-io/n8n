import { IHttpRequestOptions } from 'n8n-workflow';

export async function marcarComoPagoParcelaCarne(
	baseURL: string,
  accessToken: string,
  carneId: string,
  parcela: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/carnet/${carneId}/parcel/${parcela}/settle`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}
