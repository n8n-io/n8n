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
    placeholder: 'articles',
    default: null,
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
    typeOptions: {
      alwaysOpenEditWindow: true
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
        default: null,
        description: 'What field holds the archive value.\n',
        required: false
      },
      {
        displayName: 'Archive App Filter',
        name: 'archiveAppFilter',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'What value to use for "archived" items.\n',
        required: false
      },
      {
        displayName: 'Archive Value',
        name: 'archiveValue',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'What value to use to "unarchive" items.\n',
        required: false
      },
      {
        displayName: 'Display Template',
        name: 'displayTemplate',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Text representation of how items from this collection are shown across the system.\n',
        required: false
      },
      {
        displayName: 'Fields (JSON)',
        name: 'fields',
        type: 'json',
        placeholder: '',
        default: null,
        description: 'You are able to provide an array of `fields` to be created during the creation of the collection. See the [fields object](https://docs.directus.io/reference/api/system/fields/#the-fields-object) for more information on what properties are available in a field.\n',
        required: false,
        typeOptions: {
          alwaysOpenEditWindow: true
        }
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
        default: null,
        description: 'Name of a Google Material Design Icon that\'s assigned to this collection.\n',
        required: false
      },
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        placeholder: '',
        default: null,
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
        default: null,
        description: 'The sort field in the collection.\n',
        required: false
      },
      {
        displayName: 'Translation',
        name: 'translation',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Key value pairs of how to show this collection\'s name in different languages in the admin app.\n',
        required: false
      },
      {
        displayName: 'Unarchive Value',
        name: 'unarchiveValue',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Whether or not to show the "archived" filter.\n',
        required: false
      }
    ]
  },
  {
    displayName: 'Split Into Items',
    name: 'splitIntoItems',
    type: 'boolean',
    default: false,
    description: 'Outputs each element of an array as own item.',
    required: true,
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
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'options',
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
    placeholder: 'articles',
    default: null,
    description: 'Unique name of the collection.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
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
          'collections'
        ]
      }
    },
    options: [
      {
        displayName: 'Meta (JSON)',
        name: 'meta',
        type: 'json',
        placeholder: '{\n	"note": "Short quotes from happy customers."\n}',
        default: null,
        description: 'Metadata of the collection.\n',
        required: false,
        typeOptions: {
          alwaysOpenEditWindow: true
        }
      }
    ]
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'options',
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
    placeholder: 'articles',
    default: null,
    description: 'Unique name of the collection.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'options',
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
    placeholder: 'articles',
    default: null,
    description: 'Unique name of the collection.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
  }
] as INodeProperties[];

