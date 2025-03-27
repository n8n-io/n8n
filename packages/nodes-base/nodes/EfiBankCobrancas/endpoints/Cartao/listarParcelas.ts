import { IHttpRequestOptions } from 'n8n-workflow';

export async function listarParcelas(
	baseURL: string,
  accessToken: string,
	identificador: string,
  total: number,
  bandeira: string
): Promise<IHttpRequestOptions> {
  const url = `${baseURL}/v1/installments?total=${total}&brand=${bandeira}`;

  return {
    method: 'GET',
    url,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}`,
		'Account-Code': identificador,}
  };
}


