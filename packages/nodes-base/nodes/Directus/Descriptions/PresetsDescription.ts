import {
	INodeProperties,
} from 'n8n-workflow';

export const presetsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'presets'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new preset.'
      },
      {
        name: 'Create Multiple',
        value: 'createMultiple',
        description: 'Create Multiple Presets'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing preset.'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete Multiple Presets'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single preset by unique identifier.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List the presets.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing preset.'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Presets'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const presetsFields = [
  {
    displayName: 'Data (JSON)',
    name: 'data',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '{\n	"user": "410b5772-e63f-4ae6-9ea2-39c3a31bd6ca",\n	"layout": "cards",\n	"search": "Directus"\n}',
    default: {},
    description: 'A partial [preset object](https://docs.directus.io/reference/api/system/presets/#the-preset-object).\n',
    required: true
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        operation: [
          'list'
        ],
        resource: [
          'presets'
        ]
      }
    },
    options: [
      {
        displayName: 'Deep (JSON)',
        name: 'deep',
        type: 'json',
        placeholder: '',
        default: {},
        description: 'Deep allows you to set any of the other query parameters on a nested relational dataset.\n',
        required: false
      },
      {
        displayName: 'Export',
        name: 'export',
        type: 'options',
        placeholder: 'Select an option',
        default: 'csv',
        description: 'Saves the API response to a file. Accepts one of json, csv, xml.\n',
        required: false,
        options: [
          {
            name: 'CSV',
            value: 'csv',
            description: 'CSV'
          },
          {
            name: 'JSON',
            value: 'json',
            description: 'JSON'
          },
          {
            name: 'XML',
            value: 'xml',
            description: 'XML'
          }
        ]
      },
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Control what fields are being returned in the object.\n',
        required: false
      },
      {
        displayName: 'Filter (JSON)',
        name: 'filter',
        type: 'json',
        placeholder: '',
        default: {},
        description: 'Select items in collection by given conditions.\n',
        required: false
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        placeholder: '',
        default: 50,
        description: 'A limit on the number of objects that are returned.\n',
        required: false,
        typeOptions: {
          minValue: 1,
          maxValue: 100
        }
      },
      {
        displayName: 'Meta',
        name: 'meta',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'What metadata to return in the response.\n',
        required: false
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        placeholder: '',
        default: 0,
        description: 'How many items to skip when fetching data.\n',
        required: false
      },
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Filter by items that contain the given search query in one of their fields.\n',
        required: false
      },
      {
        displayName: 'Sort',
        name: 'sort',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'How to sort the returned items. \`sort\` is a CSV of fields used to sort the fetched items. Sorting defaults to ascending (ASC) order but a minus sign (\` - \`) can be used to reverse this to descending (DESC) order. Fields are prioritized by their order in the CSV. You can also use a \` ? \` to sort randomly.\n',
        required: false
      }
    ]
  },
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
          'presets'
        ]
      }
    },
    placeholder: '{\n	"layout": "tabular"\n}',
    default: {},
    description: 'A partial [preset object](https://docs.directus.io/reference/api/system/presets/#the-preset-object).\n',
    required: true
  },
  {
    displayName: 'ID',
    name: 'id',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '39',
    default: '',
    description: 'Primary key of the preset.\n',
    required: true
  },
  {
    displayName: 'ID',
    name: 'id',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'get'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '39',
    default: '',
    description: 'Primary key of the preset.\n',
    required: true
  },
  {
    displayName: 'Data (JSON)',
    name: 'data',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'updateMultiple'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '{\n	"keys": [15, 64],\n	"data": {\n		"layout": "tabular"\n	}\n}',
    default: {},
    description: 'Required:\n- keys [Array of primary keys of the presets you\'d like to update.]\n- data [Any of [the preset object](https://docs.directus.io/reference/api/system/presets/#the-preset-object)\'s properties.]\n\n',
    required: true
  },
  {
    displayName: 'Keys (JSON)',
    name: 'keys',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'deleteMultiple'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '[15, 251, 810]',
    default: {},
    description: 'An array of preset primary keys\n',
    required: true
  },
  {
    displayName: 'ID',
    name: 'id',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'delete'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '39',
    default: '',
    description: 'Primary key of the preset.\n',
    required: true
  },
  {
    displayName: 'Data (JSON)',
    name: 'data',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'createMultiple'
        ],
        resource: [
          'presets'
        ]
      }
    },
    placeholder: '[\n	{\n		"collection": "directus_files",\n		"user": "410b5772-e63f-4ae6-9ea2-39c3a31bd6ca",\n		"layout": "cards",\n		"search": "Directus"\n	},\n	{\n		"collection": "articles",\n		"user": "410b5772-e63f-4ae6-9ea2-39c3a31bd6ca",\n		"layout": "tabular"\n	}\n]',
    default: {},
    description: 'An array of partial [preset objects](https://docs.directus.io/reference/api/system/presets/#the-preset-object).\n',
    required: true
  }
] as INodeProperties[];

