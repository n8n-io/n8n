import EfiPay from 'sdk-node-apis-efi'
import getEfiBankConfig from '../../../../../interfaces/credentials';
import { IExecuteFunctions} from 'n8n-workflow';

export async function createReport(
  context: IExecuteFunctions,
  index: number,

): Promise<any> {
  try {
    const options = await getEfiBankConfig.call(context);
    const efipay = new EfiPay(options);

    const bodyRequestReport = context.getNodeParameter('bodyRequestReport', index) as string;
    const body = JSON.parse(bodyRequestReport)
    
    const resposta = await efipay.createReport({}, body);
    return resposta;
  } catch (error: any) {
    if (error.violacoes && error.violacoes.length > 0) {
      const primeiraViolacao = error.violacoes[0];
      throw new Error(JSON.stringify({
        razao: primeiraViolacao.razao,
        propriedade: primeiraViolacao.propriedade
      }));
    } else {
      throw new Error(JSON.stringify({
        nome: error.nome || 'erro_desconhecido',
        mensagem: error.mensagem || error.detail || 'Ocorreu um erro desconhecido',
      }));
    }
  }
}

