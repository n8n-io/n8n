import { IHttpRequestOptions } from 'n8n-workflow';

export async function reenvioParcelaCarne(
	baseURL: string,
  accessToken: string,
  carneId: string,
  parcela: string,
  email: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'POST',
    url: `${baseURL}/v1/carnet/${carneId}/parcel/${parcela}/resend`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      email: email,
    },
  };
}
