import { IHttpRequestOptions} from 'n8n-workflow';

export async function cancelarAssinatura(
	baseURL: string,
  access_token: string,
  subscriptionId: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/subscription/${subscriptionId}/cancel`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}
