import { IHttpRequestOptions, IExecuteFunctions } from 'n8n-workflow';

export async function definirBalancete(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
	chargeId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyBoletoBalancete', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/charge/${chargeId}/balance-sheet`,
    json: true,
    headers: { Authorization: `Bearer ${access_token}` },
    body: JSON.parse(requestBody),
  };
}
