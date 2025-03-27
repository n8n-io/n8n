import { INodeProperties } from 'n8n-workflow';

export const boletoConfig: INodeProperties[] = [

  {
    displayName: 'charge_id',
    name: 'charge_id',
    type: 'string',
    default: '',
    description: 'Insira o id da cobrança',
    displayOptions: {
      show: {
        endpoints: [
					'associarFormaPagamentoBoleto',
					'retornarCobrancaBoleto',
					'incluirMetadataBoleto',
					'alterarVencimento',
					'cancelarTransacaoBoleto',
					'reenviarEmailBoleto',
					'acrescentarHistoricoBoleto',
					'definirBalancete',
					'marcarComoPago'
				],
      },
    },
  },

  // Boleto One Step
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyBoletoOneStep',
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
    description: 'Insira o body da requisição para criar um boleto do tipo One Step',
    displayOptions: {
      show: {
        endpoints: ['criarBoletoOneStep'],
      },
    },
  },

	// Criar Transação
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyCriarBoleto',
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
				endpoints: ['criarTransacaoBoleto'],
			},
		},
	},

	 // Associar Forma de Pagamento
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
				endpoints: ['associarFormaPagamentoBoleto'],
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
					endpoints: ['retornarListaBoleto'],
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
					endpoints: ['retornarListaBoleto'],
				},
			},
		},

    // {
		// 	displayName: 'date_of',
		// 	name: 'date_of',
		// 	type: 'string',
		// 	default: '',
		// 	required: false,
		// 	description: 'Define por qual valor o filtro de data será aplicado',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'status',
		// 	name: 'status',
		// 	type: 'string',
		// 	default: '',
		// 	required: false,
		// 	description: 'Status das cobranças',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'customer_document',
		// 	name: 'customer_document',
		// 	type: 'string',
		// 	default: '',
		// 	required: false,
		// 	description: 'Documento do pagador',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'custom_id',
		// 	name: 'custom_id',
		// 	type: 'string',
		// 	default: '',
		// 	required: false,
		// 	description: 'ID específico de seu sistema ou aplicação',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'value',
		// 	name: 'value',
		// 	type: 'number',
		// 	default: undefined,
		// 	required: false,
		// 	description: 'valor da cobrança',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'limit',
		// 	name: 'limit',
		// 	type: 'number',
		// 	default: undefined,
		// 	required: false,
		// 	description: 'Quantidade de registros retornados pela consulta',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'page',
		// 	name: 'page',
		// 	type: 'number',
		// 	default: undefined,
		// 	required: false,
		// 	description: 'Página a ser retornada pela consulta',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

    // {
		// 	displayName: 'offset',
		// 	name: 'offset',
		// 	type: 'number',
		// 	default: undefined,
		// 	required: false,
		// 	description: 'Quantidade máxima de registros retornados em cada página',
		// 	displayOptions: {
		// 		show: {
		// 			endpoints: ['retornarListaBoleto'],
		// 		},
		// 	},
		// },

  // Incluir Metadata
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyIncluirMetadataBoleto',
    type: 'json',
    default: `{
	"notification_url": "https://www.meusite.com.br/notificacoes/",
	"custom_id": "REF001"
}`,
    description: 'Insira o body da requisição para incluir o metadata',
    displayOptions: {
      show: {
        endpoints: ['incluirMetadataBoleto'],
      },
    },
  },

  // Alterar Vencimento
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyAlterarVencimento',
    type: 'string',
    placeholder: '2025-10-16',
    default: '',
    description: 'Insira a nova data de vencimento do boleto',
    displayOptions: {
      show: {
        endpoints: ['alterarVencimento'],
      },
    },
  },

// Reenvio de Email
	{
    displayName: 'email',
    name: 'email',
    type: 'string',
    placeholder: 'name@email.com',
    default: '',
    required: true,
    description: 'E-mail para o qual o boleto será reenviado',
		displayOptions: {
			show: {
				endpoints: ['reenviarEmailBoleto'],
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
        endpoints: ['acrescentarHistoricoBoleto'],
      },
    },
  },


	//Boleto Balancete
	{
		displayName: 'Body da Requisição',
		name: 'requestBodyBoletoBalancete',
		type: 'json',
		default: `{
  "title": "Balancete Demonstrativo - Periodo 25/06/2025 a 25/07/2025",
  "body": [{
    "header": "Demonstrativo de Consumo",
    "tables": [{
      "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Despesa de condomínio:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Total lançado",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "Rateio",
        "colspan": 1
      }],
      [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Serviço de Vigilância Contratado:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 300,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 75,00",
        "colspan": 1
      }],
      [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Serviço de Zeladoria Contratado:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 130,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 32,00",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Serviço de Jardinagem:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 80,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 20,00",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Tarifa Bancária:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 10,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 2,50",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Despesa condomínio:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 800,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 320,00",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Reforma de prédio:",
        "colspan": 2
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 350,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 140,00",
        "colspan": 1
      }],  [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Investimentos:",
        "colspan": 1
      },
      {
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "Total:",
        "colspan": 1
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 1320,00",
        "colspan": 1
      },
      {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 450,00",
        "colspan": 1
      }], [{
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": " ",
        "colspan": 1
      },{
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "Total:",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 350,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 140,00",
        "colspan": 1
      }]]
    },
    {
      "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Despesas de Consumo",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Leitura de gás:",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Data: 25/11/2017",
        "colspan": 3
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Anterior",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Atual Consumo",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "g/l",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "Total",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "49,000000",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "63,000000",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "14,000000",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 53,50",
        "colspan": 1
      }]]
    },
    {
      "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Leitura de água:",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Data: 25/11/2017",
        "colspan": 3
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Anterior",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Atual Consumo",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "m³",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "Total",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "112,500000",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "114,900000",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "2,400000",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 43,00",
        "colspan": 1
      }]]
    },
    {
      "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Leitura de esgoto:",
        "colspan": 1
      },
      {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Data: 25/11/2017",
        "colspan": 3
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Anterior",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Atual Consumo",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "m³",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "Total",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "0,000000",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "0,000000",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "0,00",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 34,40",
        "colspan": 1
      }]]
    }, {
        "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "Resumo do rateio",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Despesas de condomínio",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 450,00",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Investimento",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 140,00",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Fundo de reserva 10%",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 79,59",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Leitura de gás",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 53,50",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Leitura de água",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 43,00",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Leitura de esgoto",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 34,40",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Garagens",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 5,00",
        "colspan": 2
      }],  [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Taxa de administradora",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 25,00",
        "colspan": 2
      }], [{
        "align": "right",
        "color": "#DC143C",
        "style": "bold",
        "text": "Total geral:",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#DC143C",
        "style": "bold",
        "text": "R$ 823,49",
        "colspan": 2
      }]]
    }]
  },
  {
    "header": "Balancete Geral",
    "tables": [{
      "rows": [[{
        "align": "left",
        "color": "#DC143C",
        "style": "bold",
        "text": "RECEITAS",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "RECEITAS DE CONDOMÍNIO",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 2.090,12",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "100,00%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Taxa de Condominio",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 1.030,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "49,28%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Investimentos",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 280,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "13,40%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Gás",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 50,73",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "2,43%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Garagens",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 23,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "1,10%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Reserva Técnica",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 183,19",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "8,67%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Água",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 249,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "11,91%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Esgoto",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 199,20",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "9,53%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Taxa Administradora",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 75,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "3,59%",
        "colspan": 1
      }]] }, {
      "rows": [[{
        "align": "left",
        "color": "#DC143C",
        "style": "bold",
        "text": "DESPESAS",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "DESPESAS DE CONDOMÍNIO",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 1.670,12",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "100,00%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "DESPESAS DE AQUISIÇÕES",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Despesas de condomínio",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 800,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "47,90%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Reformas do prédio",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 350,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "20,96%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": " ",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 1.150,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "68,86%",
        "colspan": 1
      }]] } , {
      "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "DESPESAS COM SERVIÇOS",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Serviço de Vigilância Contratado",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 300,00",
        "colspan": 1
      },  {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "17,96%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Serviço de Zeladoria Contratado",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 130,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "7,78%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Serviço de Jardinagem",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 80,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "4,79%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": " ",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 510,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "30,54%",
        "colspan": 1
      }]]} , {
      "rows": [[{
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "DESPESAS BANCÁRIAS",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Tarifa Bancária",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 10,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "0,60%",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": " ",
        "colspan": 2
      }, {
        "align": "center",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 10,00",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "bold",
        "text": "0,60%",
        "colspan": 1
      }]] } , {
      "rows": [[{
        "align": "left",
        "color": "#DC143C",
        "style": "bold",
        "text": "Resumo de Prestação de Contas",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "RECEITAS",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 2.090,12",
        "colspan": 2
      }],  [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "DESPESAS",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "R$ 1.670,00",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": " ",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "(Receitas - Despesas)R$ 420,12",
        "colspan": 2
      }]]} , {
      "rows": [[{
        "align": "left",
        "color": "#DC143C",
        "style": "bold",
        "text": "Resumo de Saldos",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Conta",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Saldo Anterior",
        "colspan": 1
      },{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Entradas Saídas",
        "colspan": 1
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "Saldo Atual",
        "colspan": 1
      }],  [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "BANCOS",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "21.816,28",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "2.090,12 1670,00",
        "colspan": 2
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "22.236,40",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Banco do Brasil",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "21.816,28",
        "colspan": 1
      }, {
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "2.090,12 1670,00",
        "colspan": 2
      }, {
        "align": "right",
        "color": "#000000",
        "style": "normal",
        "text": "22.236,40",
        "colspan": 2
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": " ",
        "colspan": 2
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "(Bancos + Caixa)R$ 22.236,40",
        "colspan": 2
      }]] } , {
      "rows": [[{
        "align": "left",
        "color": "#DC143C",
        "style": "bold",
        "text": "Contas a Receber",
        "colspan": 4
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Contas a Receber até 30/09/2017",
        "colspan": 3
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 2.271,27",
        "colspan": 1
      }],  [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Contas a Receber no Período de 01/10/17 até 30/10/2017",
        "colspan": 3
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 549,31",
        "colspan": 1
      }], [{
        "align": "left",
        "color": "#000000",
        "style": "normal",
        "text": "Total de Contas a Receber",
        "colspan": 3
      }, {
        "align": "left",
        "color": "#000000",
        "style": "bold",
        "text": "R$ 2.820,58",
        "colspan": 1
      }]]
    }]
  }]
}`,
		description: 'Insira o body da requisição para definir o boleto balancete',
		displayOptions: {
			show: {
				endpoints: ['definirBalancete'],
			},
		},
	},

];
