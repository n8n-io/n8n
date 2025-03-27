import { IHttpRequestOptions, IExecuteFunctions } from 'n8n-workflow';

export async function criarCarne(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestCriarCarne', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/carnet`,
    json: true,
    headers: { Authorization: `Bearer ${access_token}` },
    body: JSON.parse(requestBody),
  };
}
