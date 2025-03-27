import { IHttpRequestOptions} from 'n8n-workflow';

export async function cancelarCarne(
	baseURL: string,
  accessToken: string,
  carneId: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/carnet/${carneId}/cancel`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}
