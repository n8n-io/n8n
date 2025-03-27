import { IHttpRequestOptions } from 'n8n-workflow';

export async function marcarComoPagoCarne(
	baseURL: string,
  accessToken: string,
  carneId: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/carnet/${carneId}/settle`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}
