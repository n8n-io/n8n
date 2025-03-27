import { INodeProperties } from 'n8n-workflow';

export const carneConfig: INodeProperties[] = [

	{
    displayName: 'carnet_id',
    name: 'carnet_id',
    type: 'string',
    default: '',
    required: true,
    description: 'Insira o id do carnê',
    displayOptions: {
      show: {
        endpoints: [
					'retornarCarne',
					'incluirMetadataCarne',
					'alterarVencimentoParcela',
					'alterarVencimentoParcelas',
					'cancelarCarne',
					'cancelarParcelaCarne',
					'reenvioCarne',
					'reenvioParcelaCarne',
					'acrescentarHistoricoCarne',
					'marcarComoPagoCarne',
					'marcarComoPagoParcelaCarne'
				],
      },
    },
  },

  // Criar Carnê
  {
    displayName: 'Body da Requisição',
    name: 'requestCriarCarne',
    type: 'json',
    default: `{
  "items": [
    {
      "name": "Meu Produto",
      "value": 7500,
      "amount": 1
    }
  ],
  "customer": {
    "name": "Gorbadoc Oldbuck",
    "cpf": "94271564656",
    "phone_number": "5144916523"
  },
  "expire_at": "2031-12-20",
  "configurations": {
        "fine": 200,
        "interest": 33
      },
  "message": "Este é um espaço de até 80 caracteres para informar algo a seu cliente",
  "repeats": 5,
  "split_items": false
}`,
    description: 'Insira o body da requisição para criar um carnê',
    displayOptions: {
      show: {
        endpoints: ['criarCarne'],
      },
    },
  },

  // Retornar Lista de Carnês
  {
    displayName: 'begin_date',
    name: 'begin_date',
    type: 'string',
    default: '2025-01-01',
    required: true,
    description: 'Data início para o filtro da consulta',
    displayOptions: {
      show: {
        endpoints: ['retornarListaCarnes'],
      },
    },
  },

  {
    displayName: 'end_date',
    name: 'end_date',
    type: 'string',
    default: '2025-12-31',
    required: true,
    description: 'Data fim para o filtro da consulta',
    displayOptions: {
      show: {
        endpoints: ['retornarListaCarnes'],
      },
    },
  },

  // Incluir Metadata do Carnê
  {
    displayName: 'Body da Requisição',
    name: 'metadata',
    type: 'json',
    default: `{
  "notification_url": "https://www.meusite.com.br/notificacoes/",
  "custom_id": "258789877"
}`,
    description: 'Insira o body da requisição para incluir o metadata',
    displayOptions: {
      show: {
        endpoints: ['incluirMetadataCarne'],
      },
    },
  },

  // Alterar Vencimento de Parcela
	{
    displayName: 'parcel',
    name: 'parcela',
    type: 'string',
    default: '',
    required: true,
    description: 'Número da parcela que deseja alterar',
    displayOptions: {
      show: {
        endpoints: ['alterarVencimentoParcela', 'reenvioParcelaCarne', 'cancelarParcelaCarne', 'marcarComoPagoParcelaCarne'],
      },
    },
  },
  {
    displayName: 'Data de vencimento',
    name: 'expire_at',
    type: 'string',
    default: '2025-12-31',
    required: true,
    description: 'Novo vencimento para a parcela do carnê',
    displayOptions: {
      show: {
        endpoints: ['alterarVencimentoParcela'],
      },
    },
  },



  // Alterar Vencimento de Várias Parcelas
  {
    displayName: 'Body da Requisição',
    name: 'parcelas',
    type: 'json',
    default: `{
  "parcels": [
      {
        "parcel": 1,
        "expire_at": "2028-01-10"
      },
      {
        "parcel": 2,
        "expire_at": "2028-02-11"
      }
    ]
}`,
    description: 'Insira o body da requisição com as parcelas e as novas datas de vencimento',
    displayOptions: {
      show: {
        endpoints: ['alterarVencimentoParcelas'],
      },
    },
  },


  // Reenvio do Carnê
  {
    displayName: 'email',
    name: 'email',
    type: 'string',
		placeholder: 'name@email.com',
    default: '',
    required: true,
    description: 'E-mail para o qual o carnê será reenviado',
    displayOptions: {
      show: {
        endpoints: ['reenvioCarne', 'reenvioParcelaCarne'],
      },
    },
  },

	{
    displayName: 'Descrição',
    name: 'requestBodyHistorico',
    type: 'string',
    default: '',
    description: 'Insira a descrição para adicionar ao histórico',
    displayOptions: {
      show: {
        endpoints: ['acrescentarHistoricoCarne'],
      },
    },
  },

];

