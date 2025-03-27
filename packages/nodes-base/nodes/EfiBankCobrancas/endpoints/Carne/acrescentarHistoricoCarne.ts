import { IHttpRequestOptions, IExecuteFunctions} from 'n8n-workflow';

export async function acrescentarHistoricoCarne(
	context: IExecuteFunctions,
	index: number,
	baseURL: string,
  access_token: string,
  carneId: string,
): Promise<IHttpRequestOptions> {
	const requestBody = context.getNodeParameter('requestBodyHistorico', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/carnet/${carneId}/history`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: {
      description: requestBody,
    },
  };
}

