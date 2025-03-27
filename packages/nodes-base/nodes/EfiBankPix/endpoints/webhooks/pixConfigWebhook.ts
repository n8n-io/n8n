import EfiPay from 'sdk-node-apis-efi'
import getEfiBankConfig from '../../../../interfaces/credentials';
import { IExecuteFunctions} from 'n8n-workflow';

export async function pixConfigWebhook(
  context: IExecuteFunctions,
  index: number,

): Promise<any> {
  try {
    const options = await getEfiBankConfig.call(context);
    const efipay = new EfiPay(options);

    const urlNotification = context.getNodeParameter('urlNotification', index) as string;
    const pixKey = context.getNodeParameter('pixKey', index) as string;
    const body = {webhookUrl: urlNotification};
    
    const resposta = await efipay.pixConfigWebhook({ chave: pixKey }, body);
    return resposta;
  } catch (error: any) {
    // Verifica se o erro tem uma propriedade 'violacoes'
    if (error.violacoes && error.violacoes.length > 0) {
      // Pega a primeira violação (ou você pode adicionar lógica para pegar todas)
      const primeiraViolacao = error.violacoes[0];
      throw new Error(JSON.stringify({
        razao: primeiraViolacao.razao,
        propriedade: primeiraViolacao.propriedade
      }));
    } else if (error.erros && error.erros.length > 0) {
      // Pega a primeira violação (ou você pode adicionar lógica para pegar todas)
      const primeiroErro = error.erros[0];
      throw new Error(JSON.stringify({
        caminho: primeiroErro.caminho,
        mensagem: primeiroErro.mensagem
      }));
    }
    else {
      // Mantém o tratamento de erro anterior para outros tipos de erros
      throw new Error(JSON.stringify({
        nome: error.nome || 'erro_desconhecido',
        mensagem: error.mensagem || error.detail || 'Ocorreu um erro desconhecido',
      }));
    }
  }
}
