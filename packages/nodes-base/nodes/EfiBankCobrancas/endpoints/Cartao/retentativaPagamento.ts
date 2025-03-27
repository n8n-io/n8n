import { IHttpRequestOptions, IExecuteFunctions } from 'n8n-workflow';

export async function retentativaPagamento(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
	chargeId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyRetentativaPagamento', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/charge/${chargeId}/retry`,
    json: true,
    headers: { Authorization: `Bearer ${access_token}` },
    body: JSON.parse(requestBody),
  };
}
