import { IHttpRequestOptions, IExecuteFunctions } from 'n8n-workflow';

export async function criarLinkOneStep(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyLinkOneStep', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/charge/one-step/link`,
    json: true,
    headers: { Authorization: `Bearer ${access_token}` },
    body: JSON.parse(requestBody),
  };
}

