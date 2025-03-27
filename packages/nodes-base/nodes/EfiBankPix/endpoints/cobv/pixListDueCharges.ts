import EfiPay from 'sdk-node-apis-efi'
import getEfiBankConfig from '../../../../interfaces/credentials';
import { IExecuteFunctions } from 'n8n-workflow';

export async function pixListDueCharges(
  context: IExecuteFunctions,
  index: number,
): Promise<any> {
  try {
    const options = await getEfiBankConfig.call(context);
    const efipay = new EfiPay(options);

    const inicio = context.getNodeParameter('inicio', index) as string;
    const fim = context.getNodeParameter('fim', index) as string;
    
    // Passa o txid como primeiro argumento da função
    const resposta = await efipay.pixListDueCharges({ inicio, fim });
    return resposta;
  } catch (error: any) {
    throw new Error(JSON.stringify({
      nome: error.nome || 'erro_desconhecido',
      mensagem: error.mensagem || 'Ocorreu um erro desconhecido',
    }));
  }
}