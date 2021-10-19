import {
	INodeProperties,
} from 'n8n-workflow';

export const fieldsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'fields'
        ]
      }
    },
    options: [
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing field.'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieves the details of a single field in a given collection.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'Returns a list of the fields available in the given collection.'
      },
      {
        name: 'List All',
        value: 'listAll',
        description: 'Returns a list of the fields available in the project.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing field.'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const fieldsFields = [
  {
    displayName: 'Field',
    name: 'field',
    type: 'options',
    displayOptions: {
      show: {
        operation: [
          'get'
        ],
        resource: [
          'fields'
        ]
      }
    },
    placeholder: '',
    default: null,
    description: 'Unique name of the field. Field name is unique within the collection.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getFieldsInCollection'
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
          'fields'
        ]
      }
    },
    placeholder: 'articles',
    default: null,
    description: 'The collection name\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
  },
  {
    displayName: 'Field',
    name: 'field',
    type: 'options',
    displayOptions: {
      show: {
        operation: [
          'delete'
        ],
        resource: [
          'fields'
        ]
      }
    },
    placeholder: '',
    default: null,
    description: 'Unique name of the field. Field name is unique within the collection.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getFieldsInCollection'
    }
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
          'fields'
        ]
      }
    },
    placeholder: 'articles',
    default: null,
    description: 'The collection name\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
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
          'listAll'
        ],
        resource: [
          'fields'
        ]
      }
    }
  },
  {
    displayName: 'Field',
    name: 'field',
    type: 'options',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'fields'
        ]
      }
    },
    placeholder: 'id',
    default: null,
    description: 'Unique name of the field. Field name is unique within the collection.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getFieldsInCollection'
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
          'fields'
        ]
      }
    },
    placeholder: 'articles',
    default: null,
    description: 'The collection name\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
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
          'fields'
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
          'fields'
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
          'fields'
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
        displayName: 'Meta (JSON)',
        name: 'meta',
        type: 'json',
        placeholder: '',
        default: null,
        description: 'The meta info.\n',
        required: false,
        typeOptions: {
          alwaysOpenEditWindow: true
        }
      },
      {
        displayName: 'Schema (JSON)',
        name: 'schema',
        type: 'json',
        placeholder: '',
        default: null,
        description: 'The schema info.\n',
        required: false,
        typeOptions: {
          alwaysOpenEditWindow: true
        }
      },
      {
        displayName: 'Type',
        name: 'type',
        type: 'options',
        placeholder: 'integer',
        default: 'bigInteger',
        description: 'Directus specific data type. Used to cast values in the API.\n',
        required: false,
        options: [
          {
            name: 'Big Integer ',
            value: 'bigInteger',
            description: 'A larger number without a decimal point'
          },
          {
            name: 'Boolean ',
            value: 'boolean',
            description: 'A True or False value'
          },
          {
            name: 'CSV ',
            value: 'csv',
            description: 'A comma-separated value, returned as an array of strings'
          },
          {
            name: 'DateTime ',
            value: 'dateTime',
            description: 'A date and time saved in the database vendor\'s format'
          },
          {
            name: 'Date ',
            value: 'date',
            description: 'A date saved in the database vendor\'s format'
          },
          {
            name: 'Decimal ',
            value: 'decimal',
            description: 'A higher precision, exact decimal number often used in finances'
          },
          {
            name: 'Field Group',
            value: 'alias',
            description: 'Field Group'
          },
          {
            name: 'Float ',
            value: 'float',
            description: 'A less exact number with a floating decimal point'
          },
          {
            name: 'Hash ',
            value: 'string',
            description: 'A string hashed using argon2 cryptographic hash algorithm'
          },
          {
            name: 'Integer ',
            value: 'integer',
            description: 'A number without a decimal point'
          },
          {
            name: 'JSON ',
            value: 'json',
            description: 'A value nested in JavaScript Object Notation'
          },
          {
            name: 'M2A',
            value: 'm2a',
            description: 'Many to Any relationship'
          },
          {
            name: 'M2M',
            value: 'm2m',
            description: 'Many to Many relationship'
          },
          {
            name: 'M2O',
            value: 'integer',
            description: 'Many to One relationship'
          },
          {
            name: 'Multiple Files',
            value: 'files',
            description: 'Field for Multiple Files'
          },
          {
            name: 'O2M',
            value: 'o2m',
            description: 'One to Many relationship'
          },
          {
            name: 'Presentation',
            value: 'alias',
            description: 'Presentation'
          },
          {
            name: 'Single File',
            value: 'uuid',
            description: 'Field for a Single File'
          },
          {
            name: 'String ',
            value: 'string',
            description: 'A shorter set of characters with a configurable max length'
          },
          {
            name: 'Text ',
            value: 'text',
            description: 'A longer set of characters with no real-world max length'
          },
          {
            name: 'Timestamp ',
            value: 'timestamp',
            description: 'A date, time, and timezone saved in ISO 8601 format'
          },
          {
            name: 'Time ',
            value: 'time',
            description: 'A time saved in the database vendor\'s format'
          },
          {
            name: 'UUID ',
            value: 'uuid',
            description: 'A universally unique identifier saved in UUIDv4 format'
          }
        ]
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
          'list'
        ],
        resource: [
          'fields'
        ]
      }
    },
    placeholder: 'articles',
    default: null,
    description: 'The collection name\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCollections'
    }
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
          'fields'
        ]
      }
    }
  }
] as INodeProperties[];

