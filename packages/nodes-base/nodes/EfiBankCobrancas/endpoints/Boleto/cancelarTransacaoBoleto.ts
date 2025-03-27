import { IHttpRequestOptions} from 'n8n-workflow';

export async function cancelarTransacaoBoleto(
	baseURL: string,
  access_token: string,
  chargeId: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/charge/${chargeId}/cancel`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}
