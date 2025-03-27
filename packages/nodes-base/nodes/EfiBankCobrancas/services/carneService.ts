import { IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { criarCarne } from '../endpoints/Carne/criarCarne';
import { retornarCarne } from '../endpoints/Carne/retornarCarne';
import { retornarListaCarnes } from '../endpoints/Carne/retornarListaCarnes';
import { incluirMetadataCarne } from '../endpoints/Carne/incluirMetadataCarne';
import { alterarVencimentoParcela } from '../endpoints/Carne/alterarVencimentoParcela';
import { alterarVencimentoParcelas } from '../endpoints/Carne/alterarVencimentoParcelas';
import { cancelarCarne } from '../endpoints/Carne/cancelarCarne';
import { cancelarParcelaCarne } from '../endpoints/Carne/cancelarParcelaCarne';
import { reenvioCarne } from '../endpoints/Carne/reenvioCarne';
import { reenvioParcelaCarne } from '../endpoints/Carne/reenvioParcelaCarne';
import { acrescentarHistoricoCarne } from '../endpoints/Carne/acrescentarHistoricoCarne';
import { marcarComoPagoCarne } from '../endpoints/Carne/marcarComoPagoCarne';
import { marcarComoPagoParcelaCarne } from '../endpoints/Carne/marcarComoPagoParcelaCarne';

export async function carneService(
  this: IExecuteFunctions,
  endpoint: string,
  i: number,
	baseURL: string,
  accessToken: string
): Promise<IHttpRequestOptions> {
  let requestOptions: IHttpRequestOptions;

  try {
    switch (endpoint) {
      case 'criarCarne':
        requestOptions = await criarCarne(this, i, baseURL, accessToken);
        break;

      case 'retornarCarne':
        const chargeIdCarne = this.getNodeParameter('carnet_id', i) as string;
        if (!chargeIdCarne || typeof chargeIdCarne !== 'string') {
          throw new Error('Charge ID é obrigatório e deve ser uma string para retornar o carnê');
        }
        requestOptions = await retornarCarne(baseURL, accessToken, chargeIdCarne);
        break;

      case 'retornarListaCarnes':
        const begin_date = this.getNodeParameter('begin_date', i) as string ?? '';
        const end_date = this.getNodeParameter('end_date', i) as string ?? '';

        if (!begin_date || !end_date) {
            throw new Error('As datas de início e fim são obrigatórias');
        }

        requestOptions = await retornarListaCarnes(baseURL, accessToken, begin_date, end_date);
        break;


      case 'incluirMetadataCarne':
        const carneIdMetadata = this.getNodeParameter('carnet_id', i) as string;
        if (!carneIdMetadata || typeof carneIdMetadata !== 'string') {
          throw new Error('ID do Carnê é obrigatório e deve ser uma string');
        }
        requestOptions = await incluirMetadataCarne(this, i, baseURL, accessToken, carneIdMetadata);
        break;

      case 'alterarVencimentoParcela':
        const carneIdAlteracao = this.getNodeParameter('carnet_id', i) as string;
        const parcela = this.getNodeParameter('parcela', i);
        if (!parcela || typeof parcela !== 'string') {
          throw new Error('O parâmetro "parcela" deve ser uma string');
        }
        const novoVencimento = this.getNodeParameter('expire_at', i);
        if (!novoVencimento || typeof novoVencimento !== 'string') {
          throw new Error('O novo vencimento ("expire_at") deve ser uma string');
        }
        requestOptions = await alterarVencimentoParcela(baseURL, accessToken, carneIdAlteracao, parcela, novoVencimento);
        break;

      case 'alterarVencimentoParcelas':
        const carneIdAlteracaoParcelas = this.getNodeParameter('carnet_id', i) as string;
        const parcelas = this.getNodeParameter('parcelas', i);
        if (!parcelas) {
          throw new Error('O parâmetro "parcels" deve ser um array');
        }
        requestOptions = await alterarVencimentoParcelas(baseURL, accessToken, carneIdAlteracaoParcelas, parcelas);
        break;

      case 'cancelarCarne':
        const carneIdCancelar = this.getNodeParameter('carnet_id', i) as string;
        if (!carneIdCancelar || typeof carneIdCancelar !== 'string') {
          throw new Error('ID do Carnê é obrigatório e deve ser uma string');
        }
        requestOptions = await cancelarCarne(baseURL, accessToken, carneIdCancelar);
        break;

      case 'cancelarParcelaCarne':
        const carneIdCancelarParcela = this.getNodeParameter('carnet_id', i) as string;
        const parcelaCancela = this.getNodeParameter('parcela', i);
        if (!parcelaCancela || typeof parcelaCancela !== 'string') {
          throw new Error('O parâmetro "parcela" deve ser uma string');
        }
        requestOptions = await cancelarParcelaCarne(baseURL, accessToken, carneIdCancelarParcela, parcelaCancela);
        break;

      case 'reenvioCarne':
        const carneIdReenvio = this.getNodeParameter('carnet_id', i) as string;
        const emailReenvio = this.getNodeParameter('email', i) as string;
        if (!carneIdReenvio || typeof carneIdReenvio !== 'string') {
          throw new Error('ID do Carnê é obrigatório e deve ser uma string');
        }
        if (!emailReenvio || typeof emailReenvio !== 'string') {
          throw new Error('O parâmetro "email" deve ser uma string');
        }
        requestOptions = await reenvioCarne(baseURL, accessToken, carneIdReenvio, emailReenvio);
        break;

      case 'reenvioParcelaCarne':
        const carneIdReenvioParcela = this.getNodeParameter('carnet_id', i) as string;
        const parcelaReenvio = this.getNodeParameter('parcela', i);
        if (!parcelaReenvio || typeof parcelaReenvio !== 'string') {
          throw new Error('O parâmetro "parcela" deve ser uma string');
        }
        const emailReenvioParcela = this.getNodeParameter('email', i) as string;
        if (!emailReenvioParcela || typeof emailReenvioParcela !== 'string') {
          throw new Error('O parâmetro "email" deve ser uma string');
        }
        requestOptions = await reenvioParcelaCarne(baseURL, accessToken, carneIdReenvioParcela, parcelaReenvio, emailReenvioParcela);
        break;

			case 'acrescentarHistoricoCarne':
					const carneIdHistorico = this.getNodeParameter('carnet_id', i) as string;
					requestOptions = await acrescentarHistoricoCarne(this, i, baseURL, accessToken, carneIdHistorico);
					break;

      case 'marcarComoPagoCarne':
        const carneIdPagar = this.getNodeParameter('carnet_id', i) as string;
        if (!carneIdPagar || typeof carneIdPagar !== 'string') {
          throw new Error('ID do Carnê é obrigatório e deve ser uma string');
        }
        requestOptions = await marcarComoPagoCarne(baseURL, accessToken, carneIdPagar);
        break;

      case 'marcarComoPagoParcelaCarne':
        const carneIdPagarParcela = this.getNodeParameter('carnet_id', i) as string;
        const parcelaPagar = this.getNodeParameter('parcela', i);
        if (!parcelaPagar || typeof parcelaPagar !== 'string') {
          throw new Error('O parâmetro "parcela" deve ser uma string');
        }
        requestOptions = await marcarComoPagoParcelaCarne(baseURL, accessToken, carneIdPagarParcela, parcelaPagar);
        break;

      default:
        throw new Error('Endpoint de Carnê não implementado');
    }
  } catch (error) {
    throw new Error(`Erro ao processar o endpoint ${endpoint}: ${error.message}`);
  }

  return requestOptions;
}
