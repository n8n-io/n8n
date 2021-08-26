import {
	INodeProperties,
} from 'n8n-workflow';

export const collectionsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'collections'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new collection in Directus.'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing collection. Warning: This will delete the whole collection, including the items within. Proceed with caution.'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieves the details of a single collection.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'Returns a list of the collections available in the project.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing collection.'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const collectionsFields = [
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
          'collections'
        ]
      }
    },
    options: [
      {
        displayName: 'Collection',
        name: 'collection',
        type: 'string',
        placeholder: 'my_collection',
        default: '',
        description: 'Unique name of the collection.\n',
        required: false
      },
      {
        displayName: 'Meta (JSON)',
        name: 'meta',
        type: 'json',
        placeholder: 'JSON object',
        default: {},
        description: 'Metadata of the collection.\n',
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
          'collections'
        ]
      }
    },
    placeholder: 'my_collection',
    default: '',
    description: 'Unique name of the collection.\n',
    required: true
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
          'collections'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'my_collection',
    default: '',
    description: 'Unique name of the collection.\n',
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
          'collections'
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
          'collections'
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
          'collections'
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
        displayName: 'Archive Field',
        name: 'achiveField',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'What field holds the archive value.\n',
        required: false
      },
      {
        displayName: 'Archive App Filter',
        name: 'archiveAppFilter',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'What value to use for "archived" items.\n',
        required: false
      },
      {
        displayName: 'Archive Value',
        name: 'archiveValue',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'What value to use to "unarchive" items.\n',
        required: false
      },
      {
        displayName: 'Display Template',
        name: 'displayTemplate',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Text representation of how items from this collection are shown across the system.\n',
        required: false
      },
      {
        displayName: 'Fields (JSON)',
        name: 'fields',
        type: 'json',
        placeholder: '',
        default: {},
        description: 'You are able to provide an array of `fields` to be created during the creation of the collection. See the [fields object](https://docs.directus.io/reference/api/system/fields/#the-fields-object) for more information on what properties are available in a field.\n',
        required: false
      },
      {
        displayName: 'Hidden',
        name: 'hidden',
        type: 'boolean',
        placeholder: 'false',
        default: false,
        description: 'Whether or not the collection is hidden from the navigation in the admin app.\n',
        required: false
      },
      {
        displayName: 'Icon',
        name: 'icon',
        type: 'string',
        placeholder: 'people',
        default: '',
        description: 'Name of a Google Material Design Icon that\'s assigned to this collection.\n',
        required: false
      },
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'A note describing the collection.\n',
        required: false
      },
      {
        displayName: 'Singleton',
        name: 'singleton',
        type: 'boolean',
        placeholder: 'false',
        default: false,
        description: 'Whether or not the collection is treated as a single object.\n',
        required: false
      },
      {
        displayName: 'Sort Field',
        name: 'sortField',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'The sort field in the collection.\n',
        required: false
      },
      {
        displayName: 'Translation',
        name: 'translation',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Key value pairs of how to show this collection\'s name in different languages in the admin app.\n',
        required: false
      },
      {
        displayName: 'Unarchive Value',
        name: 'unarchiveValue',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'Whether or not to show the "archived" filter.\n',
        required: false
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
          'list'
        ],
        resource: [
          'collections'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'If the query and/or body parameter should be set via the value-key pair UI or JSON/RAW.\n',
    required: true
  },
  {
    displayName: 'Query Parameters',
    name: 'queryParametersJson',
    type: 'json',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'list'
        ],
        resource: [
          'collections'
        ],
        jsonParameters: [
          true
        ]
      }
    },
    default: '',
    description: 'Query parameters as JSON (flat object).'
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
          'collections'
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
      },
      {
        displayName: 'Split Into Items',
        name: 'splitIntoItems',
        type: 'boolean',
        default: false,
        description: 'Outputs each element of an array as own item.',
        required: false,
        displayOptions: {
          show: {
            operation: [
              'list'
            ],
            resource: [
              'collections'
            ]
          }
        }
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
          'delete'
        ],
        resource: [
          'collections'
        ]
      }
    },
    placeholder: 'my_collection',
    default: '',
    description: 'Unique name of the collection.\n',
    required: true
  }
] as INodeProperties[];

