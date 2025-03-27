import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function incluirMetadataAssinatura(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
  subscriptionId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyIncluirMetadata', index) as string;

  return {
    method: 'PUT',
    url: `${baseURL}/v1/subscription/${subscriptionId}/metadata`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.parse(requestBody),
  };
}
