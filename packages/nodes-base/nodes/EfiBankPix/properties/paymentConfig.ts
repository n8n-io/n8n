import { INodeProperties } from 'n8n-workflow';

export const paymentConfig: INodeProperties[] = [
	// txid
  {
    displayName: 'idEnvio',
    name: 'idEnvio',
    type: 'string',
    default: '',
    description: 'Insira o id de envio da cobrança',
    displayOptions: {
      show: {
        endpoints: [
          'pixSend',
          'pixSendDetailId',
          'pixQrCodePay'
        ],
      },
    },
  },

  {
    displayName: 'e2eid',
    name: 'e2eid',
    type: 'string',
    default: '',
    description: 'Insira o e2eid da cobrança',
    displayOptions: {
      show: {
        endpoints: [
          'pixSendDetail'
        ],
      },
    },
  },

  {
    displayName: 'inicio',
    name: 'inicio',
    type: 'string',
    default: '2025-01-01T00:00:00Z',
    required: true,
    description: 'Data início para o filtro da consulta',
    displayOptions: {
      show: {
        endpoints: ['pixSendList'],
      },
    },
  },

  {
    displayName: 'fim',
    name: 'fim',
    type: 'string',
    default: '2025-12-31T23:59:59Z',
    required: true,
    description: 'Data fim para o filtro da consulta',
    displayOptions: {
      show: {
        endpoints: ['pixSendList'],
      },
    },
  },

  {
    displayName: 'Pix copia e cola',
    name: 'pixCopiaECola',
    type: 'string',
    placeholder: '00020101021226830014BR.GOV.BCB.PIX2561qrcodespix.sejaefi.com.br/v2 41e0badf811a4ce6ad8a80b306821fce5204000053000065802BR5905EFISA6008SAOPAULO60070503***61040000',
    default: '',
    required: true,
    description: 'Código copia e cola do QR Code a ser detalhado',
    displayOptions: {
      show: {
        endpoints: ['pixQrCodeDetail'],
      },
    },
  },

  // Requisitar envio de Pix
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixSend',
    type: 'json',
    default: `{
  "valor": "12.34",
  "pagador": {
    "chave": "19974764017",
    "infoPagador": "Segue o pagamento da conta"
  },
  "favorecido": {
    "chave": "joão@meuemail.com"
  }
}`,
    description: 'Insira o body da requisição para o Envio de Pix',
    displayOptions: {
      show: {
        endpoints: ['pixSend'],
      },
    }, 
  },

   // Pagar Qrcode Pix
   {
    displayName: 'Body da Requisição',
    name: 'requestBodypixQrCodePay',
    type: 'json',
    default: `{
  "pagador": {
    "chave": "a1f4102e-a446-4a57-bcce-6fa48899c1d1",
    "infoPagador": "Pagamento de QR Code via API Pix"
  },
  "pixCopiaECola": "00020101021226830014BR.GOV.BCB.PIX2561qrcodespix.sejaefi.com.br/v241e0badf811a4ce6ad8a80b306821fce5204000053000065802BR5905EFISA6008SAOPAULO60070503***61040000"
}`,
    description: 'Insira o body da requisição para pagar um Qrcode Pix',
    displayOptions: {
      show: {
        endpoints: ['pixQrCodePay'],
      },
    },
  },


];

