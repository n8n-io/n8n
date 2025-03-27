import { IHttpRequestOptions } from 'n8n-workflow';

export async function retornarListaBoleto(
	baseURL: string,
  accessToken: string,
  begin_date: string,
  end_date: string
): Promise<IHttpRequestOptions> {

  const url = `${baseURL}/v1/charges?charge_type=billet&begin_date=${begin_date}&end_date=${end_date}`;

  return {
    method: 'GET',
    url,
    json: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  };
}

