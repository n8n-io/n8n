import { IHttpRequestOptions } from 'n8n-workflow';

export async function retornarCarne(
	baseURL: string,
  accessToken: string,
  carnetId: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'GET',
    url: `${baseURL}/v1/carnet/${carnetId}`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}
