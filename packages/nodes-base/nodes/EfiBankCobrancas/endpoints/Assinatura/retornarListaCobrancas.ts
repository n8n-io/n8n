import { IHttpRequestOptions} from 'n8n-workflow';

export async function retornarListaCobrancas(
	baseURL: string,
  access_token: string,
  begin_date: string,
  end_date: string
): Promise<IHttpRequestOptions> {

  const url = `${baseURL}/v1/charges?charge_type=subscription&begin_date=${begin_date}&end_date=${end_date}`;

  return {
    method: 'GET',
    url: url,
    json: true,
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  };
}
