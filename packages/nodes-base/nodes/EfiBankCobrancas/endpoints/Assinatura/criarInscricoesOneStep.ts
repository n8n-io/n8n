import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function criarInscricoesOneStep(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
  planId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyInscricaoOneStep', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/plan/${planId}/subscription/one-step`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.parse(requestBody),
  };
}
