/* eslint-disable n8n-nodes-base/node-param-display-name-miscased-id */
import { INodeProperties } from 'n8n-workflow';

export const locationConfig: INodeProperties[] = [
	// txid
  {
    displayName: 'id',
    name: 'id',
    type: 'number',
    placeholder:'57',
    default: null,
    description: 'Insira o id do location',
    displayOptions: {
      show: {
        endpoints: [
          'pixDetailLocation',
          'pixGenerateQRCode',
          'pixUnlinkTxidLocation'
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
        endpoints: ['pixLocationList'],
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
        endpoints: ['pixLocationList'],
      },
    },
  },

  {
    displayName: 'tipoCob',
    name: 'tipoCob',
    type: 'string',
    placeholder: 'cob | cobv',
    default: '',
    description: 'Tipo da cobrança que pode ser COB ou COBV',
    displayOptions: {
      show: {
        endpoints: [
          'pixCreateLocation'
        ],
      },
    },
  },


];

