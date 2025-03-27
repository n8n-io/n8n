import { IHttpRequestOptions} from 'n8n-workflow';

export async function reenvioCarne(
	baseURL: string,
  accessToken: string,
  carneId: string,
  email: string
): Promise<IHttpRequestOptions> {

  return {
    method: 'POST',
    url: `${baseURL}/v1/carnet/${carneId}/resend`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      email: email,
    },
  };
}
