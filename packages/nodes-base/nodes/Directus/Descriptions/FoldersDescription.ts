import {
	INodeProperties,
} from 'n8n-workflow';

export const foldersOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'folders'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new folder.'
      },
      {
        name: 'Create Multiple',
        value: 'createMultiple',
        description: 'Create Multiple Folders'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing folder'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete Multiple Folders'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single folder by unique identifier.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List the folders.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing folder'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Folders'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const foldersFields = [
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
          'folders'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '"Nature"',
    default: '',
    description: 'Name of the folder.\n',
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
          'folders'
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
          'folders'
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
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'folders'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    options: [
      {
        displayName: 'Parent',
        name: 'parent',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Unique identifier of the parent folder. This allows for nested folders.\n',
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
          'folders'
        ]
      }
    },
    placeholder: '0fca80c4-d61c-4404-9fd7-6ba86b64154d',
    default: '',
    description: 'Unique ID of the file object.\n',
    required: true
  },
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'folders'
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
          'update'
        ],
        resource: [
          'folders'
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
    displayName: 'Update Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'folders'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    options: [
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        placeholder: '"Cities"',
        default: '',
        description: 'Name of the folder. Can\'t be null or empty.\n',
        required: false
      },
      {
        displayName: 'Parent',
        name: 'parent',
        type: 'string',
        placeholder: 'd97c2e0e-293d-4eb5-9e1c-27d3460ad29d',
        default: '',
        description: 'Unique identifier of the parent folder. This allows for nested folders.\n',
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
          'get'
        ],
        resource: [
          'folders'
        ]
      }
    },
    placeholder: '0fca80c4-d61c-4404-9fd7-6ba86b64154d',
    default: '',
    description: 'Unique ID of the file object.\n',
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
          'folders'
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
          'updateMultiple'
        ],
        resource: [
          'folders'
        ]
      }
    },
    placeholder: '{\n	"keys": ["fac21847-d5ce-4e4b-a288-9abafbdfbc87", "a5bdb793-dd85-4ac9-882a-b42862092983"],\n	"data": {\n		"parent": "d97c2e0e-293d-4eb5-9e1c-27d3460ad29d"\n	}\n}',
    default: {},
    description: 'Any of [the folder object](https://docs.directus.io/reference/api/system/folders/#the-folder-object)\'s properties.\n',
    required: true
  },
  {
    displayName: 'Keys',
    name: 'keys',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'deleteMultiple'
        ],
        resource: [
          'folders'
        ]
      }
    },
    placeholder: '"d97c2e0e-293d-4eb5-9e1c-27d3460ad29d", "fc02d733-95b8-4e27-bd4b-08a32cbe4e66"',
    default: '',
    description: 'CSV of folder primary keys.\n',
    required: true
  },
  {
    displayName: 'Names',
    name: 'names',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'createMultiple'
        ],
        resource: [
          'folders'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '"Nature", "Cities"',
    default: '',
    description: 'Name of the folder.\n',
    required: true
  },
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'createMultiple'
        ],
        resource: [
          'folders'
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
          'createMultiple'
        ],
        resource: [
          'folders'
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
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        operation: [
          'createMultiple'
        ],
        resource: [
          'folders'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    options: [
      {
        displayName: 'Parents',
        name: 'parents',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Unique identifier of the parent folder. This allows for nested folders.\n',
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
          'delete'
        ],
        resource: [
          'folders'
        ]
      }
    },
    placeholder: '0fca80c4-d61c-4404-9fd7-6ba86b64154d',
    default: '',
    description: 'Unique ID of the file object.\n',
    required: true
  }
] as INodeProperties[];

