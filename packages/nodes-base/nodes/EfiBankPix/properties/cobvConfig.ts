import { INodeProperties } from 'n8n-workflow';

export const cobvConfig: INodeProperties[] = [
	// txid
  {
    displayName: 'txid',
    name: 'txid',
    type: 'string',
    default: '',
    description: 'Insira o txid da cobrança',
    displayOptions: {
      show: {
        endpoints: [
          'pixCreateDueCharge',
          'pixUpdateDueCharge',
          'pixDetailDueCharge'
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
        endpoints: ['pixListDueCharges'],
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
        endpoints: ['pixListDueCharges'],
      },
    },
  },

  
  // Criar cobrança com vencimento 
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixCreateDueCharge',
    type: 'json',
    default: `{
  "calendario": {
    "dataDeVencimento": "2025-05-01",
    "validadeAposVencimento": 30
  },
  "devedor": {
    "logradouro": "Alameda Souza, Numero 80, Bairro Braz",
    "cidade": "Recife",
    "uf": "PE",
    "cep": "70011750",
    "cpf": "12345678909",
    "nome": "Francisco da Silva"
  },
  "valor": {
    "original": "123.45",
    "multa": {
      "modalidade": 2,
      "valorPerc": "15.00"
    },
    "juros": {
      "modalidade": 2,
      "valorPerc": "2.00"
    },
    "desconto": {
      "modalidade": 1,
      "descontoDataFixa": [
        {
          "data": "2022-11-30",
          "valorPerc": "30.00"
        }
      ]
    }
  },
  "chave": "71cdf9ba-c695-4e3c-b010-abb521a3f1be",
  "solicitacaoPagador": "Insira o número ou identificador do pedido."
}`,
    description: 'Insira o body da requisição para criar uma cobrança com vencimento',
    displayOptions: {
      show: {
        endpoints: ['pixCreateDueCharge'],
      },
    },
  },

   // Revisar cobrança com vencimento
   {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixUpdateDueCharge',
    type: 'json',
    default: `{
  "loc": {
      "id": 789
  },
  "devedor": {
    "logradouro": "Alameda Souza, Numero 80, Bairro Braz",
    "cidade": "Recife",
    "uf": "PE",
    "cep": "70011750",
    "cpf": "12345678909",
    "nome": "Francisco da Silva"
  },
  "valor": {
    "original": "123.45"
  },
  "solicitacaoPagador": "Cobrança dos serviços prestados."
}`,
    description: 'Insira o body da requisição para revisar(modificar) uma cobrança Pix',
    displayOptions: {
      show: {
        endpoints: ['pixUpdateDueCharge'],
      },
    },
  },


];

