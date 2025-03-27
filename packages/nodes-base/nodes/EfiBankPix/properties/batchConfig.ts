/* eslint-disable n8n-nodes-base/node-param-display-name-miscased-id */
import { INodeProperties } from 'n8n-workflow';

export const batchConfig: INodeProperties[] = [
	// txid
  {
    displayName: 'id',
    name: 'id',
    type: 'number',
    placeholder: '57',
    default: null,
    description: 'Insira o id do lote',
    displayOptions: {
      show: {
        endpoints: [
          'pixCreateDueChargeBatch',
          'pixUpdateDueChargeBatch',
          'pixDetailDueChargeBatch'
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
        endpoints: ['pixListDueChargeBatch'],
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
        endpoints: ['pixListDueChargeBatch'],
      },
    },
  },

 // Criar/Alterar lote de cobranças com vencimento
 {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixCreateDueChargeBatch',
    type: 'json',
    default: `{
  "descricao": "Cobranças dos alunos do turno vespertino",
  "cobsv": [
    {
      "calendario": {
          "dataDeVencimento": "2020-12-31",
          "validadeAposVencimento": 30
      },
      "txid": "fb2761260e554ad593c7226beb5cb650",
      "devedor": {
          "cpf": "08577095428",
          "nome": "João Souza"
      },
      "valor": {
          "original": "100.00"
      },
      "chave": "7c084cd4-54af-4172-a516-a7d1a12b75cc",
      "solicitacaoPagador": "Informar matrícula"
      },
      {
      "calendario": {
          "dataDeVencimento": "2020-12-31",
          "validadeAposVencimento": 30
      },
      "txid": "7978c0c97ea847e78e8849634473c1f1",
      "devedor": {
          "cpf": "15311295449",
          "nome": "Manoel Silva"
      },
      "valor": {
          "original": "100.00"
      },
      "chave": "7c084cd4-54af-4172-a516-a7d1a12b75cc",
      "solicitacaoPagador": "Informar matrícula"
    }
  ]
}`,
    description: 'Insira o body da requisição para Criar/Alterar lote de cobranças com vencimento',
    displayOptions: {
      show: {
        endpoints: ['pixCreateDueChargeBatch'],
      },
    }, 
  },

  //Revisar cobranças específicas de um lote
 {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixUpdateDueCharge',
    type: 'json',
    default: `{
   "cobsv": [
    {
      "calendario": {
        "dataDeVencimento": "2020-01-10"
      },
      "txid": "fb2761260e554ad593c7226beb5cb650",
      "valor": {
        "original": "110.00"
      }
    },
    {
      "calendario": {
        "dataDeVencimento": "2020-01-10"
      },
      "txid": "7978c0c97ea847e78e8849634473c1f1",
      "valor": {
        "original": "110.00"
      }
    }
  ]
}`,
    description: 'Insira o body da requisição para revisar cobranças específicas de um lote',
    displayOptions: {
      show: {
        endpoints: ['pixUpdateDueChargeBatch'],
      },
    }, 
  },

];

