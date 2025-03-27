import { INodeProperties } from 'n8n-workflow';

export const cartaoConfig: INodeProperties[] = [

  {
    displayName: 'charge_id',
    name: 'charge_id',
    type: 'string',
    default: '',
    description: 'Insira o id da cobrança',
    displayOptions: {
      show: {
        endpoints: [
					'associarFormaPagamentoCartao',
					'retentativaPagamento',
					'estornoPagamento',
					'retornarCobrancaCartao',
					'incluirMetadataCartao',
					'cancelarTransacaoCartao',
					'acrescentarHistoricoCartao'
				],
      },
    },
  },

  // Cartão One Step
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyCartaoOneStep',
    type: 'json',
    default: `{
  "items": [
    {
      "name": "Meu Produto",
      "value": 1000,
      "amount": 1
    }
  ],
  "payment": {
    "credit_card": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "phone_number": "5144916523"
      },
      "installments": 1,
      "payment_token": ""
    }
  }
}`,
    description: 'Insira o body da requisição para criar um transação do tipo cartão com a API One Step',
    displayOptions: {
      show: {
        endpoints: ['criarCartaoOneStep'],
      },
    },
  },

	// Criar Transação
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyCriarCartao',
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
				endpoints: ['criarTransacaoCartao'],
			},
		},
	},

	 // Associar Forma de Pagamento
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyAssociarFormaPagamentoCartao',
		type: 'json',
		default: `{
	"payment": {
		"credit_card": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "phone_number": "5144916523"
      },
      "installments": 1,
      "payment_token": ""
    }
	}
}`,
		description: 'Insira o body da requisição para associar a forma de pagamento',
		displayOptions: {
			show: {
				endpoints: ['associarFormaPagamentoCartao'],
			},
		},
	},

	 // Retentativa Pagamento
	 {
		displayName: 'Body da Requisição',
		name: 'requestBodyRetentativaPagamento',
		type: 'json',
		default: `{
	"payment": {
		"credit_card": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "phone_number": "5144916523"
      },
       "billing_address": {
        "street": "Avenida Juscelino Kubitschek",
        "number": "909",
        "neighborhood": "Bauxita",
        "zipcode": "35400000",
        "city": "Ouro Preto",
        "complement": "",
        "state": "MG"
      },
      "payment_token": ""
    }
	}
}`,
		description: 'Insira o body da requisição para a retentativade pagamento',
		displayOptions: {
			show: {
				endpoints: ['retentativaPagamento'],
			},
		},
	},

	 // Estorno Pagamento
	 {
    displayName: 'Valor do estorno',
    name: 'amount',
	type: 'number',
    placeholder: '1000',
    default: null,
    description: 'Insira o valor da cobrança a ser estornado',
    displayOptions: {
      show: {
        endpoints: ['estornoPagamento'],
      },
    },
  },

	  // Retornar Lista de Cobranças
		{
			displayName: 'begin_date',
			name: 'begin_date',
			type: 'string',
			default: '2025-01-01',
			required: true,
			description: 'Data início para o filtro da consulta',
			displayOptions: {
				show: {
					endpoints: ['retornarListaCartao'],
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
					endpoints: ['retornarListaCartao'],
				},
			},
		},

  // Incluir Metadata
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyIncluirMetadataCartao',
    type: 'json',
    default: `{
	"notification_url": "https://www.meusite.com.br/notificacoes/",
	"custom_id": "REF001"
}`,
    description: 'Insira o body da requisição para incluir o metadata',
    displayOptions: {
      show: {
        endpoints: ['incluirMetadataCartao'],
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
        endpoints: ['acrescentarHistoricoCartao'],
      },
    },
  },

	// Listar parcelas
	{
		displayName: 'Identificador de conta (payee_code)',
		name: 'identificador',
		type: 'string',
		default: "",
		required: true,
		description: 'Insira o identificador da conta',
		displayOptions: {
			show: {
				endpoints: ['listarParcelas'],
			},
		},
	},
	{
		displayName: 'Valor total da cobrança',
		name: 'total',
		type: 'number',
		default: 1000,
		required: true,
		description: 'Insira o valor total da cobrança',
		displayOptions: {
			show: {
				endpoints: ['listarParcelas'],
			},
		},
	},

	{
		displayName: 'Bandeira do cartão',
		name: 'bandeira',
		type: 'string',
		default: 'mastercard',
		required: true,
		description: 'Insira a Bandeira do cartão',
		displayOptions: {
			show: {
				endpoints: ['listarParcelas'],
			},
		},
	},

];
