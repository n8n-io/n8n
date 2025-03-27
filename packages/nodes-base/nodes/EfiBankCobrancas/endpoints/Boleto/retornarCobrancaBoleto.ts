import { IHttpRequestOptions} from 'n8n-workflow';

export async function retornarCobrancaBoleto(
	baseURL: string,
  access_token: string,
  chargeId: string,
): Promise<IHttpRequestOptions> {

  return {
    method: 'GET',
    url: `${baseURL}/v1/charge/${chargeId}`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}
