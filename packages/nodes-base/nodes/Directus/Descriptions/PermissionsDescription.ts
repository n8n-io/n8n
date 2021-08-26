import {
	INodeProperties,
} from 'n8n-workflow';

export const permissionsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'permissions'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new permission.'
      },
      {
        name: 'Create Multiple',
        value: 'createMultiple',
        description: 'Create Multiple Permission Rules'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing permission'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete Multiple Permissions'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single permissions object by unique identifier.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List all permissions.'
      },
      {
        name: 'List My',
        value: 'listMy',
        description: 'List the permissions that apply to the current user.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing permission'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Permissions'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const permissionsFields = [
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
          'permissions'
        ]
      }
    },
    placeholder: '34',
    default: '',
    description: 'Primary key of the permission rule.\n',
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
          'permissions'
        ]
      }
    },
    placeholder: '{\n	"fields": ["id", "title", "body"]\n}',
    default: {},
    description: 'A partial [permissions object](https://docs.directus.io/reference/api/system/permissions/#the-permission-object).\n',
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
          'permissions'
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
    displayName: 'Collection',
    name: 'collection',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'permissions'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'customers',
    default: '',
    description: 'What collection this permission applies to.\n',
    required: true
  },
  {
    displayName: 'Action',
    name: 'action',
    type: 'options',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'permissions'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'create',
    default: 'create',
    description: 'What CRUD operation this permission rule applies to. One of `create`, `read`, `update`, `delete`.\n',
    required: true,
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
        name: 'Read',
        value: 'read',
        description: 'Read'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update'
      }
    ]
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
          'permissions'
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
          'permissions'
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
          'permissions'
        ]
      }
    },
    placeholder: '34',
    default: '',
    description: 'Primary key of the permission rule.\n',
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
          'permissions'
        ]
      }
    },
    placeholder: '[34, 64]',
    default: {},
    description: 'An array of permission primary keys\n',
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
          'permissions'
        ]
      }
    },
    placeholder: '[\n	{\n		"collection": "pages",\n		"action": "read",\n		"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7",\n		"fields": ["id", "title"]\n	},\n	{\n		"collection": "pages",\n		"action": "create",\n		"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7",\n		"fields": ["id", "title"]\n	}\n]',
    default: {},
    description: 'An array of partial [permissions objects](https://docs.directus.io/reference/api/system/permissions/#the-permission-object). `action` and `collection` are required.\n',
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
          'permissions'
        ]
      }
    },
    placeholder: '34',
    default: '',
    description: 'Primary key of the permission rule.\n',
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
          'permissions'
        ]
      }
    },
    placeholder: '{\n	"keys": [34, 65],\n	"data": {\n		"fields": ["id", "title", "body"]\n	}\n}',
    default: {},
    description: 'Required:\n- keys [Array of primary keys of the permissions you\'d like to update.]\n- data [Any of [the permission object](https://docs.directus.io/reference/api/system/permissions/#the-permission-object)\'s properties.]\n',
    required: true
  }
] as INodeProperties[];

