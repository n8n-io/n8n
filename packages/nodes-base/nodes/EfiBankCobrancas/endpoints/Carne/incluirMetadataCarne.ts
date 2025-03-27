import { IHttpRequestOptions, IExecuteFunctions } from 'n8n-workflow';

export async function incluirMetadataCarne(
	context: IExecuteFunctions,
  index: number,
	baseURL: string,
  accessToken: string,
  carneId: string,
): Promise<IHttpRequestOptions> {
	const requestBody = context.getNodeParameter('metadata', index) as string;

  return {
    method: 'PUT',
    url: `${baseURL}/v1/carnet/${carneId}/metadata`,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.parse(requestBody),
  };
}
