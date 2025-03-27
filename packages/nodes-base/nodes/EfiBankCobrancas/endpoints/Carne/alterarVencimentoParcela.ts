import { IHttpRequestOptions } from 'n8n-workflow';

export async function alterarVencimentoParcela(
	baseURL: string,
  accessToken: string,
  carneId: string,
  parcela: string,
  novoVencimento: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'PUT',
    url: `${baseURL}/v1/carnet/${carneId}/parcel/${parcela}`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      expire_at: novoVencimento,
    },
  };
}
