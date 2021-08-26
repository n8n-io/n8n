import {
	INodeProperties,
} from 'n8n-workflow';

export const webhooksOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'webhooks'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new webhook.'
      },
      {
        name: 'Create Multiple',
        value: 'createMultiple',
        description: 'Create Multiple Webhooks'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing webhook'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete Multiple Webhooks'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single webhook by unique identifier.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'Get all webhooks.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing webhook'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Webhooks'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const webhooksFields = [
  {
    displayName: 'Name',
    name: 'name',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'webhooks'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '"Build Website"',
    default: '',
    description: 'Name for the webhook. Shown in the Admin App.\n',
    required: true
  },
  {
    displayName: 'Actions',
    name: 'actions',
    type: 'multiOptions',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'webhooks'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '["create", "update"]',
    default: [],
    description: 'When to fire the webhook. Can contain create, update, delete.\n',
    required: true,
    typeOptions: {
      multipleValues: true
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update'
      }
    ]
  },
  {
    displayName: 'Collections (JSON)',
    name: 'collections',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'webhooks'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '["articles"]',
    default: {},
    description: 'What collections to fire this webhook on.\n',
    required: true
  },
  {
    displayName: 'URL',
    name: 'url',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'webhooks'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '"https://example.com/"',
    default: '',
    description: 'Where to send the request too.\n',
    required: true
  },
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'webhooks'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON/RAW.\n',
    required: true
  },
  {
    displayName: 'Body Parameters',
    name: 'bodyParametersJson',
    type: 'json',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'webhooks'
        ],
        jsonParameters: [
          true
        ]
      }
    },
    default: '',
    description: 'Body parameters as JSON or RAW.'
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
          'webhooks'
        ]
      }
    },
    placeholder: '15',
    default: '',
    description: 'Primary key of the webhook.\n',
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
          'webhooks'
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
    displayName: 'ID',
    name: 'id',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'webhooks'
        ]
      }
    },
    placeholder: '15',
    default: '',
    description: 'Primary key of the webhook.\n',
    required: true
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
          'webhooks'
        ]
      }
    },
    placeholder: '{\n	"name": "Build Website"\n}',
    default: {},
    description: 'A partial [webhook object](https://docs.directus.io/reference/api/system/webhooks/#the-webhook-object).\n',
    required: true
  },
  {
    displayName: 'Keys (JSON)',
    name: 'keys',
    type: 'json',
    displayOptions: {
      show: {
        operation: [
          'updateMultiple'
        ],
        resource: [
          'webhooks'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '[2, 15, 41]',
    default: {},
    description: 'An array of webhook primary keys.\n',
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
          'webhooks'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '{\n	"name": "Build Website"\n}',
    default: {},
    description: 'Any of [the webhook object](https://docs.directus.io/reference/api/system/webhooks/#the-webhook-object)\'s properties.\n',
    required: true
  },
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'updateMultiple'
        ],
        resource: [
          'webhooks'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON/RAW.\n',
    required: true
  },
  {
    displayName: 'Body Parameters',
    name: 'bodyParametersJson',
    type: 'json',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'updateMultiple'
        ],
        resource: [
          'webhooks'
        ],
        jsonParameters: [
          true
        ]
      }
    },
    default: '',
    description: 'Body parameters as JSON or RAW.'
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
          'webhooks'
        ]
      }
    },
    placeholder: '[\n	{\n		"name": "Example",\n		"actions": ["create", "update"],\n		"collections": ["articles"],\n		"url": "https://example.com"\n	},\n	{\n		"name": "Second Example",\n		"actions": ["delete"],\n		"collections": ["articles"],\n		"url": "https://example.com/on-delete"\n	}\n]',
    default: {},
    description: 'An array of partial [webhook object](https://docs.directus.io/reference/api/system/webhooks/#the-webhook-object).\n`name`, `actions`, `collections`, and `url` are required.\n',
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
          'webhooks'
        ]
      }
    },
    placeholder: '[2, 15, 41]',
    default: {},
    description: 'An array of webhook primary keys.\n',
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
          'webhooks'
        ]
      }
    },
    placeholder: '15',
    default: '',
    description: 'Primary key of the webhook.\n',
    required: true
  }
] as INodeProperties[];

