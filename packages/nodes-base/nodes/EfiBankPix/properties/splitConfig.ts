import { INodeProperties } from 'n8n-workflow';

export const splitConfig: INodeProperties[] = [
    {
        displayName: 'txid',
        name: 'txid',
        type: 'string',
        default: '',
        required: true,
        description: 'Insira o txid da cobrança que deseja obter detalhes',
        displayOptions: {
          show: {
            endpoints: ['pixSplitDetailCharge', 'pixSplitLinkCharge', 'pixSplitUnlinkCharge', 'pixSplitDetailDueCharge', 'pixSplitLinkDueCharge', 'pixSplitUnlinkDueCharge'],
          },
        },
    },
    {
        displayName: 'splitConfigId',
        name: 'splitConfigId',
        type: 'string',
        default: '',
        required: true,
        description: 'Insira o identificador do Split de pagamento',
        displayOptions: {
          show: {
            endpoints: ['pixSplitLinkCharge', 'pixSplitLinkDueCharge', 'getEfiBankConfig', 'pixSplitDetailConfig', 'pixSplitConfigId'],
          },
        },
    },

    //Configuração de um Split de pagamento (sem passar id)
    {
      displayName: 'Body da Requisição',
      name: 'bodyRequestSplitConfig',
      type: 'json',
      default: `{
    "descricao": "Split pagamento -  Plano 1",
    "lancamento": {
        "imediato": true
    },
    "split": {
        "divisaoTarifa": "assumir_total",
        "minhaParte": {
            "tipo": "porcentagem",
            "valor": "60.00"
        },
        "repasses": [
            {
                "tipo": "porcentagem",
                "valor": "15.00",
                "favorecido": {
                    "cpf": "12345678909",
                    "conta": "1234567"
                }
            },
            {
                "tipo": "porcentagem",
                "valor": "25.00",
                "favorecido": {
                    "cpf": "94271564656",
                    "conta": "7654321"
                }
            }
        ]
    }
}`,
      required: true,
      description: 'Body responsável pela criação do Split de pagamento sem informar um id',
      displayOptions: {
        show: {
          endpoints: ['pixSplitConfig'],
        },
      },
  },

  //Configuração de um Split de pagamento (com id)
  {
    displayName: 'Body da Requisição',
    name: 'bodyRequestSplitConfigId',
    type: 'json',
    default: `{
    "descricao": "Split pagamento -  Plano 2",
    "lancamento": {
        "imediato": true
    },
    "split": {
        "divisaoTarifa": "assumir_total",
        "minhaParte": {
            "tipo": "porcentagem",
            "valor": "60.00"
        },
        "repasses": [
            {
                "tipo": "porcentagem",
                "valor": "20.00",
                "favorecido": {
                    "cpf": "12345678909",
                    "conta": "1234567"
                }
            },
            {
                "tipo": "porcentagem",
                "valor": "20.00",
                "favorecido": {
                    "cpf": "94271564656",
                    "conta": "7654321"
                }
            }
        ]
    }
}`,
    required: true,
    description: 'Body responsável pela criação do Split de pagamento com um id vinculado',
    displayOptions: {
      show: {
        endpoints: ['pixSplitConfigId'],
      },
    },
},

];

