import {
	INodeProperties,
} from 'n8n-workflow';

export const relationsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'relations'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new relation.'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing relation.'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single relation by unique identifier.'
      },
      {
        name: 'Get Multiple',
        value: 'getMultiple',
        description: 'Get Relations in a Collection'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List all relations that exist in Directus.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing relation'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const relationsFields = [
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
          'relations'
        ]
      }
    },
    placeholder: '{\n	"collection": "articles",\n	"field": "featured_image",\n	"related_collection": "directus_files"\n}',
    default: {},
    description: 'A partial [relation object](https://docs.directus.io/reference/api/system/relations/#the-relation-object).\n',
    required: true
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"books"',
    default: '',
    description: 'Unique name of the parent collection\n',
    required: true
  },
  {
    displayName: 'Field',
    name: 'field',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"author"',
    default: '',
    description: 'Name of the field that holds the related primary key. This matches the column name in the database.\n',
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
          'relations'
        ]
      }
    },
    placeholder: '{\n	"meta": {\n		"one_field": "articles"\n	}\n}',
    default: {},
    description: 'A partial [relation object](https://docs.directus.io/reference/api/system/relations/#the-relation-object).\n',
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
          'relations'
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
          'get'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"books"',
    default: '',
    description: 'Unique name of the parent collection\n',
    required: true
  },
  {
    displayName: 'Field',
    name: 'field',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'get'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"author"',
    default: '',
    description: 'Name of the field that holds the related primary key. This matches the column name in the database.\n',
    required: true
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'delete'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"books"',
    default: '',
    description: 'Unique name of the parent collection\n',
    required: true
  },
  {
    displayName: 'Field',
    name: 'field',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'delete'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"author"',
    default: '',
    description: 'Name of the field that holds the related primary key. This matches the column name in the database.\n',
    required: true
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'getMultiple'
        ],
        resource: [
          'relations'
        ]
      }
    },
    placeholder: '"articles"',
    default: '',
    description: 'Unique name of the parent collection\n',
    required: true
  }
] as INodeProperties[];

