import { INodeProperties } from 'n8n-workflow';

export const linkConfig: INodeProperties[] = [

  {
    displayName: 'charge_id',
    name: 'charge_id',
    type: 'string',
    default: '',
    description: 'Insira o id da cobrança',
    displayOptions: {
      show: {
        endpoints: [
					'associarFormaPagamentoLink',
					'retornarLink',
					'incluirMetadataLink',
					'alterarLink',
					'cancelarTransacaoLink',
					'acrescentarHistoricoLink',
					'reenviarEmailLink'
				],
      },
    },
  },

  // Link One Step
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyLinkOneStep',
    type: 'json',
    default: `{
  "items": [
    {
      "amount": 5,
      "name": "Game of Thrones",
      "value": 827
    },
    {
      "amount": 2,
      "name": "Dexter",
      "value": 620
    }
  ],
  "metadata": {
      "custom_id": "produto 1",
      "notification_url": "https://www.meusite.com.br/notificacoes/n"
  },
  "customer": {
          "email": "email_do_cliente@servidor.com.br"
      },
  "shippings": [
    {
      "name": "Ouro Preto",
      "value": 500
    }
  ],
  "settings": {
    "billet_discount": 500,
    "card_discount": 300,
    "message": "Escreva aqui, se quiser, uma mensagem ao seu cliente, limite de 80 caracteres",
    "conditional_discount":{
      "type": "percentage",
      "value": 100,
      "until_date": "2032-11-30"
    },
    "payment_method": "all",
    "expire_at": "2032-12-30",
    "request_delivery_address": true
  }
}`,
    description: 'Insira o body da requisição para criar um link de pagamento em One Step',
    displayOptions: {
      show: {
        endpoints: ['criarLinkOneStep'],
      },
    },
  },

	// Criar Transação Link
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyCriarTransacaoLink',
		type: 'json',
		default: `{
	"items": [{
		"name": "Produto de Exemplo",
		"value": 5000,
		"amount": 1
	}]
}`,
		description: 'Insira o body da requisição para criar uma transação',
		displayOptions: {
			show: {
				endpoints: ['criarTransacaoLink'],
			},
		},
	},

	 // Associar Forma de Pagamento
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyAssociarFormaPagamentoLink',
		type: 'json',
		default: `{
	"message": "Escreva aqui, se quiser, uma mensagem ao seu cliente, limite de 80 caracteres",
  "payment_method": "all",
  "expire_at": "2032-12-30",
  "request_delivery_address": false,
  "billet_discount": 500,
  "card_discount": 300
}`,
		description: 'Insira o body da requisição para criar um link de pagamento em Two Stpes',
		displayOptions: {
			show: {
				endpoints: ['associarFormaPagamentoLink'],
			},
		},
	},



  // Incluir Metadata
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyIncluirMetadataLink',
    type: 'json',
    default: `{
	"notification_url": "https://www.meusite.com.br/notificacoes/",
	"custom_id": "REF001"
}`,
    description: 'Insira o body da requisição para incluir o metadata',
    displayOptions: {
      show: {
        endpoints: ['incluirMetadataLink'],
      },
    },
  },

  // Alterar Vencimento
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyAlterarLink',
    type: 'json',
    default: `{
	"billet_discount": 500,
  "card_discount" : 200,
  "expire-at": "2024-12-15"
}`,
    description: 'Insira o body da requisição para alterar o vencimento do link',
    displayOptions: {
      show: {
        endpoints: ['alterarLink'],
      },
    },
  },

// Reenvio de Email
	{
		displayName: 'email',
		name: 'requestBodyReenviarEmailLink',
		type: 'string',
    placeholder: 'name@email.com',
    default: '',
		description: 'Insira o email para o reenvio do link',
		displayOptions: {
			show: {
				endpoints: ['reenviarEmailLink'],
			},
		},
	},


  // Acrescentar Histórico
  {
    displayName: 'Descrição',
    name: 'requestBodyHistorico',
    type: 'string',
    default: '',
    description: 'Insira a descrição para adicionar ao histórico',
    displayOptions: {
      show: {
        endpoints: ['acrescentarHistoricoLink'],
      },
    },
  },

];
