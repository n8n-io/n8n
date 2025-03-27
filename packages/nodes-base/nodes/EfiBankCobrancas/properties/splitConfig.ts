import { INodeProperties } from 'n8n-workflow';

export const splitConfig: INodeProperties[] = [

  {
    displayName: 'charge_id',
    name: 'charge_id',
    type: 'string',
    default: '',
    description: 'Insira o id da cobrança',
    displayOptions: {
      show: {
        endpoints: [
					'associarFormaPagamentoSplitBoleto',
					'associarFormaPagamentoSplitCartao'
				],
      },
    },
  },

  // Split Boleto One Step
  {
    displayName: 'Body da Requisição',
    name: 'requestBodySplitOneStepBoleto',
    type: 'json',
    default: `{
  "items": [
    {
      "name": "Meu Produto",
      "value": 1000,
      "amount": 1,
      "marketplace": {
        "repasses": [
          {
            "payee_code": "payee_code1",
            "percentage": 2500
          },
          {
            "payee_code": "payee_code2",
            "percentage": 1500
          }
        ]
      }
    }
  ],
  "payment": {
    "banking_billet": {
      "customer": {
        "name": "Gorbadoc Oldbuck",
        "cpf": "94271564656",
        "email": "email_do_cliente@servidor.com.br",
        "phone_number": "5144916523",
        "address": {
          "street": "Avenida Juscelino Kubitschek",
          "number": "909",
          "neighborhood": "Bauxita",
          "zipcode": "35400000",
          "city": "Ouro Preto",
          "complement": "",
          "state": "MG"
        }
      },
      "expire_at": "2032-12-30",
      "configurations": {
        "fine": 200,
        "interest": 33
      },
      "message": "Essa cobrança pode ser paga pelo código de barras e pelo QR Code"
    }
  }
}`,
    description: 'Insira o body da requisição para criar uma transação Split de pagamento em One Step do tipo boleto',
    displayOptions: {
      show: {
        endpoints: ['criarSplitOneStepBoleto'],
      },
    },
  },

	 // Split Cartão One Step
	 {
    displayName: 'Body da Requisição',
    name: 'requestBodySplitOneStepCartao',
    type: 'json',
    default: `{
  "items": [
    {
      "name": "Meu Produto",
      "value": 1000,
      "amount": 1,
      "marketplace": {
        "repasses": [
          {
            "payee_code": "payee_code1",
            "percentage": 2500
          },
          {
            "payee_code": "payee_code2",
            "percentage": 1500
          }
        ]
      }
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
    description: 'Insira o body da requisição para criar uma transação Split de pagamento em One Step do tipo cartão',
    displayOptions: {
      show: {
        endpoints: ['criarSplitOneStepCartao'],
      },
    },
  },

	// Criar Split
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyCriarTransacaoSplit',
		type: 'json',
		default: `{
	"items": [{
		"name": "Produto de Exemplo",
		"value": 5000,
		"amount": 1,
      "marketplace": {
        "repasses": [
          {
            "payee_code": "payee_code1",
            "percentage": 2500
          },
          {
            "payee_code": "payee_code2",
            "percentage": 1500
          }
        ]
      }
		}
	]
}`,
		description: 'Insira o body da requisição para criar uma transação',
		displayOptions: {
			show: {
				endpoints: ['criarTransacaoSplit'],
			},
		},
	},

	 // Associar Forma de Pagamento - Boleto
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyAssociarFormaPagamentoBoleto',
		type: 'json',
		default: `{
	"payment": {
		"banking_billet": {
			"expire_at": "2025-05-15",
			"customer": {
				"name": "Gorbadoc Oldbuck",
				"cpf": "94271564656",
				"phone_number": "5144916523"
			}
		}
	}
}`,
		description: 'Insira o body da requisição para associar a forma de pagamento',
		displayOptions: {
			show: {
				endpoints: ['associarFormaPagamentoSplitBoleto'],
			},
		},
	},

	 // Associar Forma de Pagamento - Cartao
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
				endpoints: ['associarFormaPagamentoSplitCartao'],
			},
		},
	},

];
