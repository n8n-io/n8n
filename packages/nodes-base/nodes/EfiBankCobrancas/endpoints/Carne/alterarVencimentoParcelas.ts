import { IHttpRequestOptions } from 'n8n-workflow';

export async function alterarVencimentoParcelas(
	baseURL: string,
  accessToken: string,
  carneId: string,
  parcelas: any
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/carnet/${carneId}/parcels`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.parse(parcelas)
  };
}
