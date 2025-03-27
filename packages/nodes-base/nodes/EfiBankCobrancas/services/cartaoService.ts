import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { criarCartaoOneStep } from '../endpoints/Cartao/criarCartaoOneStep';
import { criarTransacaoCartao } from '../endpoints/Cartao/criarTransacaoCartao';
import { associarFormaPagamentoCartao } from '../endpoints/Cartao/associarFormaPagamentoCartao';
import { retentativaPagamento } from '../endpoints/Cartao/retentativaPagamento';
import { estornoPagamento } from '../endpoints/Cartao/estornoPagamento';
import { retornarCobrancaCartao } from '../endpoints/Cartao/retornarCobrancaCartao';
import { retornarListaCartao } from '../endpoints/Cartao/retornarListaCartao';
import { incluirMetadataCartao } from '../endpoints/Cartao/incluirMetadataCartao';
import { cancelarTransacaoCartao } from '../endpoints/Cartao/cancelarTransacaoCartao';
import { acrescentarHistoricoCartao } from '../endpoints/Cartao/acrescentarHistoricoCartao';
import { listarParcelas } from '../endpoints/Cartao/listarParcelas';

export async function cartaoService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
	baseURL: string,
  accessToken: string
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;

  switch (endpoint) {
    case 'criarCartaoOneStep':
      requestOptions = await criarCartaoOneStep(this, i, baseURL, accessToken);
      break;

    case 'criarTransacaoCartao':
      requestOptions = await criarTransacaoCartao(this, i, baseURL, accessToken);
      break;

    case 'associarFormaPagamentoCartao':
			const cartaoIdAssociar = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await associarFormaPagamentoCartao(this, i, baseURL, accessToken, cartaoIdAssociar);
      break;

    case 'retentativaPagamento':
      const cartaoIdRetentativa = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await retentativaPagamento(this, i, baseURL, accessToken, cartaoIdRetentativa);
      break;

    case 'estornoPagamento':
      const cartaoIdEstorno = this.getNodeParameter('charge_id', i) as string;
      const amount = this.getNodeParameter('amount', i) as number;
      requestOptions = await estornoPagamento(baseURL, accessToken, cartaoIdEstorno, amount);
      break;

    case 'retornarCobrancaCartao':
      const cartaoIdRetornar = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await retornarCobrancaCartao(baseURL, accessToken, cartaoIdRetornar);
      break;

    case 'retornarListaCartao':
					const begin_date = this.getNodeParameter('begin_date', i) as string ?? '';
					const end_date = this.getNodeParameter('end_date', i) as string ?? '';

					if (!begin_date || !end_date) {
						throw new Error('As datas de início e fim são obrigatórias');
					}

					requestOptions = await retornarListaCartao(baseURL, accessToken, begin_date, end_date);
					break;

		case 'incluirMetadataCartao':
			const cartaoIdMetadata = this.getNodeParameter('charge_id', i) as string;
			requestOptions = await incluirMetadataCartao(this, i, baseURL, accessToken, cartaoIdMetadata);
			break;

		case 'cancelarTransacaoCartao':
      const cartaoIdCancelar = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await cancelarTransacaoCartao(baseURL, accessToken, cartaoIdCancelar);
      break;

    case 'acrescentarHistoricoCartao':
      const cartaoIdHistorico = this.getNodeParameter('charge_id', i) as string;
      requestOptions = await acrescentarHistoricoCartao(this, i, baseURL, accessToken, cartaoIdHistorico);
      break;

		case 'listarParcelas':
			const identificador = this.getNodeParameter('identificador', i) as string ?? '';
			const total = Math.trunc(Number(this.getNodeParameter('total', i) ?? 0));
			const bandeira = this.getNodeParameter('bandeira', i) as string ?? '';
			requestOptions = await listarParcelas(baseURL, accessToken, identificador, total, bandeira);
			break;

    default:
      throw new Error('Endpoint de Cartão não implementado');
  }

  return requestOptions;
}
