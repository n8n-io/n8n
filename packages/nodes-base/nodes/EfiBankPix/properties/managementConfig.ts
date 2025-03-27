/* eslint-disable n8n-nodes-base/node-param-display-name-miscased-id */
import { INodeProperties } from 'n8n-workflow';

export const managementConfig: INodeProperties[] = [
	// txid
  {
    displayName: 'id',
    name: 'id',
    type: 'string',
    default: '',
    description: 'Insira o id da devolução',
    displayOptions: {
      show: {
        endpoints: [
          'pixDevolution',
          'pixDetailDevolution'
        ],
      },
    },
  },

  {
    displayName: 'e2eid',
    name: 'e2eId',
    type: 'string',
    default: '',
    description: 'Insira o e2eid da cobrança',
    displayOptions: {
      show: {
        endpoints: [
          'pixDetailReceived',
          'pixDevolution',
          'pixDetailDevolution'
        ],
      },
    },
  },

  {
    displayName: 'valor',
    name: 'valor',
    type: 'string',
    placeholder: '',
    default: '0.01',
    description: 'Insira o valor da devolução',
    displayOptions: {
      show: {
        endpoints: [
          'pixDevolution',
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
        endpoints: ['pixReceivedList'],
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
        endpoints: ['pixReceivedList'],
      },
    },
  },


];

