import * as get from './get';

import { INodeProperties } from 'n8n-workflow';

export {
  get
};


export const descriptions = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'reports',
        ],
      },
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Get company report',
      }
    ],
    default: 'get',
    description: '',
  },
  ...get.description
] as INodeProperties[];