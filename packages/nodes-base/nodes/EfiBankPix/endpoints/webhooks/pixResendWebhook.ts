import EfiPay from 'sdk-node-apis-efi'
import getEfiBankConfig from '../../../../interfaces/credentials';
import { IExecuteFunctions} from 'n8n-workflow';

export async function pixResendWebhook(
  context: IExecuteFunctions,
  index: number,

): Promise<any> {
  try {
    const options = await getEfiBankConfig.call(context);
    const efipay = new EfiPay(options);

    const bodyWebhookResend = context.getNodeParameter('bodyWebhookResend', index) as string;
    const body = JSON.parse(bodyWebhookResend)
    
    await efipay.pixResendWebhook({}, body);
    return ['code: 202'];
  } catch (error: any) {
    // Verifica se o erro tem uma propriedade 'violacoes'
    if (error.violacoes && error.violacoes.length > 0) {
      // Pega a primeira violação (ou você pode adicionar lógica para pegar todas)
      const primeiraViolacao = error.violacoes[0];
      throw new Error(JSON.stringify({
        razao: primeiraViolacao.razao,
        propriedade: primeiraViolacao.propriedade
      }));
    } else {
      // Mantém o tratamento de erro anterior para outros tipos de erros
      throw new Error(JSON.stringify({
        nome: error.nome || 'erro_desconhecido',
        mensagem: error.mensagem || error.detail || 'Ocorreu um erro desconhecido',
      }));
    }
  }
}

