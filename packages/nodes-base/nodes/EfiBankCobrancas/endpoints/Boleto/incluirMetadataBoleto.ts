import { IHttpRequestOptions, IExecuteFunctions} from 'n8n-workflow';

export async function incluirMetadataBoleto(
  context: IExecuteFunctions,
	index: number,
	baseURL: string,
  access_token: string,
  chargeId: string,
): Promise<IHttpRequestOptions> {
	const requestBody = context.getNodeParameter('requestBodyIncluirMetadataBoleto', index) as string;

  return {
    method: 'PUT',
    url: `${baseURL}/v1/charge/${chargeId}/metadata`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.parse(requestBody),
  };
}
