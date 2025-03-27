import { IHttpRequestOptions } from 'n8n-workflow';

export async function retornarInformacoesPlano(
	baseURL: string,
  access_token: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'GET',
    url: `${baseURL}/v1/plans`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}
