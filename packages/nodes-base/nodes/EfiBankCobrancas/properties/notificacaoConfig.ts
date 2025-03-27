import { INodeProperties } from 'n8n-workflow';

export const notificacaoConfig: INodeProperties[] = [
	{
    displayName: 'token de notificação',
    name: 'token',
    // eslint-disable-next-line n8n-nodes-base/node-param-type-options-password-missing
    type: 'string',
    default: '',
    description: 'Insira o token da notificação',
    displayOptions: {
      show: {
        endpoints: [
					'consultarNotificacao'
				],
      },
    },
  },

];
