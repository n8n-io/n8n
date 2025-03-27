import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function historicoAssinatura(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
  subscriptionId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyHistorico', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/subscription/${subscriptionId}/history`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      description: requestBody,
    },
  };
}


