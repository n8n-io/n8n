import {
	INodeProperties,
} from 'n8n-workflow';

export const filesOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'files'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new file'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing file.'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete multiple files.'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single file by unique identifier.'
      },
      {
        name: 'Import File',
        value: 'importFile',
        description: 'Import a file.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List the files.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing file.'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Files'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const filesFields = [
  {
    displayName: 'Send Binary Data',
    name: 'sendBinaryData',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'files'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'Upload/create a new file.\n',
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
          'files'
        ]
      }
    },
    placeholder: '0fca80c4-d61c-4404-9fd7-6ba86b64154d',
    default: '',
    description: 'Unique ID of the file object.\n',
    required: true
  },
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyName',
    type: 'string',
    required: true,
    default: 'data',
    displayOptions: {
      show: {
        sendBinaryData: [
          true
        ],
        operation: [
          'update'
        ],
        resource: [
          'files'
        ]
      }
    },
    description: 'Name of the binary property which contains the data for the file to be uploaded.<br />\n                            For multiple files, values can be provided in the format:<br />\n                            "binaryProperty1,binaryProperty2'
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
          'files'
        ]
      }
    },
    options: [
      {
        displayName: 'File Object (JSON)',
        name: 'fileObject',
        type: 'json',
        placeholder: '',
        default: {},
        description: 'Other properties of [the file object](https://docs.directus.io/reference/api/system/files/#the-file-object). \n',
        required: false
      }
    ]
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
          'files'
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
          'get'
        ],
        resource: [
          'files'
        ]
      }
    },
    placeholder: '0fca80c4-d61c-4404-9fd7-6ba86b64154d',
    default: '',
    description: 'Unique ID of the file object.\n',
    required: true
  },
  {
    displayName: 'Send Binary Data',
    name: 'sendBinaryData',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'files'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'Upload/create a new file.\n',
    required: true
  },
  {
    displayName: 'Binary Property',
    name: 'binaryPropertyName',
    type: 'string',
    required: true,
    default: 'data',
    displayOptions: {
      show: {
        sendBinaryData: [
          true
        ],
        operation: [
          'create'
        ],
        resource: [
          'files'
        ]
      }
    },
    description: 'Name of the binary property which contains the data for the file to be uploaded.<br />\n                            For multiple files, values can be provided in the format:<br />\n                            "binaryProperty1,binaryProperty2'
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
          'files'
        ]
      }
    },
    options: [
      {
        displayName: 'File Object (JSON)',
        name: 'fileObject',
        type: 'json',
        placeholder: '',
        default: {},
        description: 'Other properties of [the file object](https://docs.directus.io/reference/api/system/files/#the-file-object). \n',
        required: false
      }
    ]
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
          'files'
        ]
      }
    },
    placeholder: '"b6123925-2fc0-4a30-9d86-863eafc0a6e7", "d17c10aa-0bad-4864-9296-84f522c753e5"',
    default: '',
    description: 'Array of primary keys of the files you\'d like to update.\n',
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
          'files'
        ]
      }
    },
    placeholder: '0fca80c4-d61c-4404-9fd7-6ba86b64154d',
    default: '',
    description: 'Unique ID of the file object.\n',
    required: true
  },
  {
    displayName: 'URL',
    name: 'url',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'importFile'
        ],
        resource: [
          'files'
        ]
      }
    },
    placeholder: '',
    default: '',
    description: 'The URL to download the file from.\n',
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
          'importFile'
        ],
        resource: [
          'files'
        ]
      }
    },
    options: [
      {
        displayName: 'Data (JSON)',
        name: 'data',
        type: 'json',
        placeholder: '{\n	"title": "Example"\n}',
        default: {},
        description: 'Any of [the file object](https://docs.directus.io/reference/api/system/files/#the-file-object)\'s properties.\n',
        required: false
      }
    ]
  },
  {
    displayName: 'Keys',
    name: 'keys',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'updateMultiple'
        ],
        resource: [
          'files'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '"b6123925-2fc0-4a30-9d86-863eafc0a6e7", "d17c10aa-0bad-4864-9296-84f522c753e5"',
    default: '',
    description: 'Array of primary keys of the files you\'d like to update.\n',
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
          'files'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: '{\n  "tags": ["cities"]\n}',
    default: {},
    description: 'Any of [the file object](https://docs.directus.io/reference/api/system/files/#the-file-object)\'s properties.\n',
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
          'files'
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
          'files'
        ],
        jsonParameters: [
          true
        ]
      }
    },
    default: '',
    description: 'Body parameters as JSON or RAW.'
  }
] as INodeProperties[];

