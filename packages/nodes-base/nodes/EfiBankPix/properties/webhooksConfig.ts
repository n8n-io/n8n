import { INodeProperties } from 'n8n-workflow';

export const webhooksConfig: INodeProperties[] = [
   {
     displayName: 'chave',
     name: 'pixKey',
     type: 'string',
     default: '',
     required: true,
     description: 'Sua chave Pix vinculada a conta',
     displayOptions: {
       show: {
         endpoints: ['pixConfigWebhook', 'pixDeleteWebhook', 'pixDetailWebhook'],
       },
     },
   },
   {
    displayName: 'Url do webhook',
    name: 'urlNotification',
    type: 'string',
    placeholder: 'https://exemplo-pix/webhook',
    default: '',
    required: true,
    description: 'URL para onde a notificação vai ser enviada',
    displayOptions: {
      show: {
        endpoints: ['pixConfigWebhook'],
      },
    },
  },
  {
    displayName: 'inicio',
    name: 'begin',
    type: 'string',
    default: '2025-01-01T00:00:00Z',
    required: true,
    description: 'Data de início da busca',
    displayOptions: {
      show: {
        endpoints: ['pixListWebhook'],
      },
    },
  },
  {
    displayName: 'fim',
    name: 'end',
    type: 'string',
    default: '2025-12-31T23:59:59Z',
    required: true,
    description: 'Data de fim da busca',
    displayOptions: {
      show: {
        endpoints: ['pixListWebhook'],
      },
    },
  },
  {
    displayName: 'Body da Requisição',
    name: 'bodyWebhookResend',
    type: 'json',
    default: ` {
  "tipo": "PIX_RECEBIDO",
  "e2eids": [
        "E09089356202501151648API44aff264",
      "E09089356202501151647API77209f1c"
  ]
}`,
    required: true,
    description: 'O body a ser enviado pela requisição contendo os atributos: tipo | e2eids',
    displayOptions: {
      show: {
        endpoints: ['pixResendWebhook'],
      },
    },
  }
];

