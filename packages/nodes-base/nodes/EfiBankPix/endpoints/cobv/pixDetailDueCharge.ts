import EfiPay from 'sdk-node-apis-efi'
import getEfiBankConfig from '../../../../interfaces/credentials';
import { IExecuteFunctions } from 'n8n-workflow';

export async function pixDetailDueCharge(
  context: IExecuteFunctions,
  index: number,
): Promise<any> {
  try {
    const options = await getEfiBankConfig.call(context);
    const efipay = new EfiPay(options);

    // Obtém os parâmetros do node
    const txid = context.getNodeParameter('txid', index) as string;
    
    // Passa o txid como primeiro argumento da função
    const resposta = await efipay.pixDetailDueCharge({ txid });
    return resposta;
  } catch (error: any) {
    throw new Error(JSON.stringify({
      nome: error.nome || 'erro_desconhecido',
      mensagem: error.mensagem || 'Ocorreu um erro desconhecido',
    }));
  }
}