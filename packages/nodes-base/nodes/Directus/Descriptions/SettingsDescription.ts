import {
	INodeProperties,
} from 'n8n-workflow';

export const settingsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'settings'
        ]
      }
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve Settings'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update the settings'
      }
    ],
    default: 'get',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const settingsFields = [
  {
    displayName: 'Data (JSON)',
    name: 'data',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'settings'
        ]
      }
    },
    placeholder: '{\n	"project_url": "https://example.com/"\n}',
    default: {},
    description: 'A partial [settings object](https://docs.directus.io/reference/api/system/settings/#the-settings-object).\n',
    required: true
  }
] as INodeProperties[];

