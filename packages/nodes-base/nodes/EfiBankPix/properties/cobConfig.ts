import { INodeProperties } from 'n8n-workflow';

export const cobConfig: INodeProperties[] = [
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
          'pixCreateCharge',
          'pixUpdateCharge',
          'pixDetailCharge'
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
        endpoints: ['pixListCharges'],
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
        endpoints: ['pixListCharges'],
      },
    },
  },

  // Criar cobrança imediata (sem txid)
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixCreateImmediateCharge',
    type: 'json',
    default: `{
  "calendario": {
    "expiracao": 3600
  },
  "devedor": {
    "cpf": "12345678909",
    "nome": "José de Alencar"
  },
  "valor": {
    "original": "0.01"
  },
  "chave": "71cdf9ba-c695-4e3c-b010-abb521a3f1be",
  "solicitacaoPagador": "Insira o número ou identificador do pedido."
}`,
    description: 'Insira o body da requisição para criar uma cobrança Pix',
    displayOptions: {
      show: {
        endpoints: ['pixCreateImmediateCharge'],
      },
    }, 
  },
  
  // Criar cobrança imediata (com txid)
  {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixCreateCharge',
    type: 'json',
    default: `{
  "calendario": {
    "expiracao": 3600
  },
  "devedor": {
    "cpf": "12345678909",
    "nome": "José de Alencar"
  },
  "valor": {
    "original": "0.01"
  },
  "chave": "71cdf9ba-c695-4e3c-b010-abb521a3f1be",
  "solicitacaoPagador": "Insira o número ou identificador do pedido."
}`,
    description: 'Insira o body da requisição para criar uma cobrança Pix',
    displayOptions: {
      show: {
        endpoints: ['pixCreateCharge'],
      },
    },
  },

   // Revisar cobrança
   {
    displayName: 'Body da Requisição',
    name: 'requestBodyPixUpdateCharge',
    type: 'json',
    default: `{
  "loc": {
    "id": 7768
  },
  "devedor": {
    "cpf": "12345678909",
    "nome": "Francisco da Silva"
  },
  "valor": {
    "original": "123.45"
  },
  "solicitacaoPagador": "Insira o número ou identificador do pedido."
}`,
    description: 'Insira o body da requisição para revisar(modificar) uma cobrança Pix',
    displayOptions: {
      show: {
        endpoints: ['pixUpdateCharge'],
      },
    },
  },


];

