import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';

export async function criarInscricoesTwoSteps(
  context: IExecuteFunctions,
  index: number,
	baseURL: string,
  access_token: string,
  planId: string
): Promise<IHttpRequestOptions> {
  const requestBody = context.getNodeParameter('requestBodyInscricaoTwoSteps', index) as string;

  return {
    method: 'POST',
    url: `${baseURL}/v1/plan/${planId}/subscription`,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.parse(requestBody),
  };
}
