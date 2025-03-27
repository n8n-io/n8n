// import EfiPay from 'sdk-node-apis-efi'
// import options from '../../credentials';

// let params = {
//     idEnvio: '01',
// }

// let body = {
//     pagador: {
//         chave: "a1f4102e-a446-4a57-bcce-6fa48899c1d1",
//         infoPagador: "Pagamento de QR Code via API Pix"
//     },
//     pixCopiaECola: "00020101021226830014BR.GOV.BCB.PIX2561qrcodespix.sejaefi.com.br/v2 41e0badf811a4ce6ad8a80b306821fce5204000053000065802BR5905EFISA6008SAOPAULO60070503***61040000"
// };



// const efipay = new EfiPay(options)

// // O método pixQrCodePay indica os campos que devem ser enviados e que serão retornados
// efipay.pixQrCodePay(params, body)
//     .then((resposta) => {
//         console.log(resposta) // Aqui você tera acesso a resposta da API e os campos retornados de forma intuitiva
//     })
//     .catch((error) => {
//         console.log(error)
//     })

import EfiPay from 'sdk-node-apis-efi'
import getEfiBankConfig from '../../../../interfaces/credentials';
import { IExecuteFunctions } from 'n8n-workflow';

export async function pixQrCodePay(
  context: IExecuteFunctions,
  index: number,
): Promise<any> {
  try {
    const options = await getEfiBankConfig.call(context);
    const efipay = new EfiPay(options);

    // Obtém os parâmetros do node
    const idEnvio = context.getNodeParameter('idEnvio', index) as string;
    const requestBody = context.getNodeParameter('requestBodypixQrCodePay', index) as string;

    const body = JSON.parse(requestBody);
    
    // Passa o txid como primeiro argumento da função
    const resposta = await efipay.pixQrCodePay({ idEnvio }, body);
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
    } else {
      // Mantém o tratamento de erro anterior para outros tipos de erros
      throw new Error(JSON.stringify({
        nome: error.nome || 'erro_desconhecido',
        mensagem: error.mensagem || error.detail || 'Ocorreu um erro desconhecido',
      }));
    }
  }
}
