import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function associarPlanoLink(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
  planId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyAssociarPlanoLink', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/plan/${planId}/subscription/one-step/link`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.parse(requestBody),
  };
}
