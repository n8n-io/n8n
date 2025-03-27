import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { criarBoletoOneStep } from '../endpoints/Boleto/criarBoletoOneStep';
import { criarTransacaoBoleto } from '../endpoints/Boleto/criarTransacaoBoleto';
import { associarFormaPagamentoBoleto } from '../endpoints/Boleto/associarFormaPagamentoBoleto';
import { retornarCobrancaBoleto } from '../endpoints/Boleto/retornarCobrancaBoleto';
import { retornarListaBoleto } from '../endpoints/Boleto/retornarListaBoleto';
import { incluirMetadataBoleto } from '../endpoints/Boleto/incluirMetadataBoleto';
import { alterarVencimento } from '../endpoints/Boleto/alterarVencimento';
import { cancelarTransacaoBoleto } from '../endpoints/Boleto/cancelarTransacaoBoleto';
import { reenviarEmailBoleto } from '../endpoints/Boleto/reenviarEmailBoleto';
import { acrescentarHistoricoBoleto } from '../endpoints/Boleto/acrescentarHistoricoBoleto';
import { definirBalancete } from '../endpoints/Boleto/definirBalancete';
import { marcarComoPago } from '../endpoints/Boleto/marcarComoPago';


export async function boletoService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
	baseURL: string,
  accessToken: string
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;

  switch (endpoint) {
    case 'criarBoletoOneStep':
      requestOptions = await criarBoletoOneStep(this, i, baseURL, accessToken);
      break;

    case 'criarTransacaoBoleto':
      requestOptions = await criarTransacaoBoleto(this, i, baseURL, accessToken);
      break;

    case 'associarFormaPagamentoBoleto':
			const boletoIdAssociar = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await associarFormaPagamentoBoleto(this, i, baseURL, accessToken, boletoIdAssociar);
      break;

		case 'retornarCobrancaBoleto':
			const boletoIdRetornar = this.getNodeParameter('charge_id', i) as string;
			if (!boletoIdRetornar || typeof boletoIdRetornar !== 'string') {
				throw new Error('Charge ID é obrigatório e deve ser uma string para retornar o carnê');
			}
			requestOptions = await retornarCobrancaBoleto(baseURL, accessToken, boletoIdRetornar);
			break;

		case 'retornarListaBoleto':
			const begin_date = this.getNodeParameter('begin_date', i) as string ?? '';
      const end_date = this.getNodeParameter('end_date', i) as string ?? '';

			if (!begin_date || !end_date) {
				throw new Error('As datas de início e fim são obrigatórias');
			}

			requestOptions = await retornarListaBoleto(baseURL, accessToken, begin_date, end_date);
			break;

    case 'incluirMetadataBoleto':
      const boletoIdMetadata = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await incluirMetadataBoleto(this, i, baseURL, accessToken, boletoIdMetadata);
      break;

    case 'alterarVencimento':
      const boletoIdVencimento = this.getNodeParameter('charge_id', i) as string;
      const expire_at = this.getNodeParameter('expire_at', i) as string;
      requestOptions = await alterarVencimento(baseURL, accessToken, boletoIdVencimento, expire_at);
      break;

    case 'cancelarTransacaoBoleto':
      const boletoIdCancelar = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await cancelarTransacaoBoleto(baseURL, accessToken, boletoIdCancelar);
      break;

    case 'reenviarEmailBoleto':
			const boletoIdReenvio = this.getNodeParameter('charge_id', i) as string;
      const emailReenvio = this.getNodeParameter('email', i) as string;
      requestOptions = await reenviarEmailBoleto(baseURL, accessToken, boletoIdReenvio, emailReenvio);
      break;

    case 'acrescentarHistoricoBoleto':
      const boletoIdHistorico = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await acrescentarHistoricoBoleto(this, i, baseURL, accessToken, boletoIdHistorico);
      break;

		case 'definirBalancete':
			const chargeIdBalancete = this.getNodeParameter('charge_id', i) as string;
			requestOptions = await definirBalancete(this, i, baseURL, accessToken, chargeIdBalancete);
			break;

		case 'marcarComoPago':
			const boletoIdPagar = this.getNodeParameter('charge_id', i) as string;
			requestOptions = await marcarComoPago(baseURL, accessToken, boletoIdPagar);
			break;

			default:
				throw new Error(`Endpoint de Boleto não implementado`);
  }

  return requestOptions;
}
