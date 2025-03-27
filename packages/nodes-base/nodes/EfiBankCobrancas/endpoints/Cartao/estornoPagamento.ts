import { IHttpRequestOptions} from 'n8n-workflow';

export async function estornoPagamento(
	baseURL: string,
  access_token: string,
	chargeId: string,
  amount: number
): Promise<IHttpRequestOptions> {
  

  return {
    method: 'POST',
    url: `${baseURL}/v1/charge/card/${chargeId}/refund`,
    json: true,
    headers: { Authorization: `Bearer ${access_token}` },
    body: {
      amount: amount,
    },
  };
}
