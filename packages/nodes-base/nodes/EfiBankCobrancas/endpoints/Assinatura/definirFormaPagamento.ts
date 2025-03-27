import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function definirFormaPagamento(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
  subscriptionId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyFormaPagamento', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/subscription/${subscriptionId}/pay`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.parse(requestBody),
  };
}
