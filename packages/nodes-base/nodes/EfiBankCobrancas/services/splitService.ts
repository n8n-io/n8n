import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { criarSplitOneStepBoleto } from '../endpoints/SplitDePagamento/criarSplitOneStepBoleto';
import { criarSplitOneStepCartao } from '../endpoints/SplitDePagamento/criarSplitOneStepCartao';
import { criarTransacaoSplit } from '../endpoints/SplitDePagamento/criarTransacaoSplit';
import { associarFormaPagamentoSplitBoleto } from '../endpoints/SplitDePagamento/associarFormaPagamentoSplitBoleto';
import { associarFormaPagamentoSplitCartao } from '../endpoints/SplitDePagamento/associarFormaPagamentoSplitCartao';

export async function splitService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
	baseURL: string,
  accessToken: string
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;

  switch (endpoint) {
    case 'criarSplitOneStepBoleto':
      requestOptions = await criarSplitOneStepBoleto(this, i, baseURL, accessToken);
      break;

    case 'criarSplitOneStepCartao':
      requestOptions = await criarSplitOneStepCartao(this, i, baseURL, accessToken);
      break;

		case 'criarTransacaoSplit':
				requestOptions = await criarTransacaoSplit(this, i, baseURL, accessToken);
				break;

		case 'associarFormaPagamentoSplitBoleto':
			const boletoIdSplit = this.getNodeParameter('charge_id', i) as string;
			requestOptions = await associarFormaPagamentoSplitBoleto(this, i, baseURL, accessToken, boletoIdSplit);
			break;

		case 'associarFormaPagamentoSplitCartao':
			const cartaoIdSplit = this.getNodeParameter('charge_id', i) as string;
			requestOptions = await associarFormaPagamentoSplitCartao(this, i, baseURL, accessToken, cartaoIdSplit);
			break;

			default:
				throw new Error(`Endpoint de Split não implementado`);
  }

  return requestOptions;
}
