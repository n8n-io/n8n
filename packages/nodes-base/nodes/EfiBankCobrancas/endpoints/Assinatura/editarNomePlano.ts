import {IHttpRequestOptions } from 'n8n-workflow';

export async function editarNomePlano(
	baseURL: string,
  access_token: string,
  planId: string,
  nome_plano: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/plan/${planId}`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      name: nome_plano,
    }
  };
}
