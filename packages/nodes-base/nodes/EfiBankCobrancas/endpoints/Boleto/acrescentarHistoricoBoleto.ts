import { IHttpRequestOptions, IExecuteFunctions} from 'n8n-workflow';

export async function acrescentarHistoricoBoleto(
	context: IExecuteFunctions,
	index: number,
	baseURL: string,
  access_token: string,
  chargeId: string,
): Promise<IHttpRequestOptions> {
	const requestBody = context.getNodeParameter('requestBodyHistorico', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/charge/${chargeId}/history`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      description: requestBody,
    },
  };
}
