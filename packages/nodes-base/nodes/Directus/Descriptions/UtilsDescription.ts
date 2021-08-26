import {
	INodeProperties,
} from 'n8n-workflow';

export const utilsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'utils'
        ]
      }
    },
    options: [
      {
        name: 'Clear Cache',
        value: 'clearCache',
        description: 'Clear the Internal Cache'
      },
      {
        name: 'Generate Hash',
        value: 'generateHash',
        description: 'Generate a Hash'
      },
      {
        name: 'Get a Random String',
        value: 'getRandomString',
        description: 'Returns a random string of given length.'
      },
      {
        name: 'Import File Data',
        value: 'importFileData',
        description: 'Import Data from File'
      },
      {
        name: 'Sort Items',
        value: 'sortItems',
        description: 'Re-sort items in collection based on start and to value of item'
      },
      {
        name: 'Verifiy Hash',
        value: 'verfiyHash',
        description: 'Verify a Hash'
      }
    ],
    default: 'clearCache',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const utilsFields = [
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        operation: [
          'getRandomString'
        ],
        resource: [
          'utils'
        ]
      }
    },
    options: [
      {
        displayName: 'Length',
        name: 'length',
        type: 'number',
        placeholder: '20',
        default: 0,
        description: 'Length of the random string.\n',
        required: false
      }
    ]
  },
  {
    displayName: 'String',
    name: 'string',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'verfiyHash'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '"Hello World!"',
    default: '',
    description: 'Source string.\n',
    required: true
  },
  {
    displayName: 'Hash',
    name: 'hash',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'verfiyHash'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '"$arg...fEfM"',
    default: '',
    description: 'Hash you want to verify against.\n',
    required: true
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'importFileData'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '"articles"',
    default: '',
    description: 'Unique name of the collection to import the data to.\n',
    required: true
  },
  {
    displayName: 'Send Binary Data',
    name: 'sendBinaryData',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'importFileData'
        ],
        resource: [
          'utils'
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
          'importFileData'
        ],
        resource: [
          'utils'
        ]
      }
    },
    description: 'Name of the binary property which contains the data for the file to be uploaded.<br />\n                            For multiple files, values can be provided in the format:<br />\n                            "binaryProperty1,binaryProperty2'
  },
  {
    displayName: 'String',
    name: 'string',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'generateHash'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '"Hello World!"',
    default: '',
    description: 'String to hash.\n',
    required: true
  },
  {
    displayName: 'To',
    name: 'to',
    type: 'number',
    displayOptions: {
      show: {
        operation: [
          'sortItems'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '51',
    default: 0,
    description: 'Primary key of item where to move the current item to\n',
    required: true
  },
  {
    displayName: 'Item',
    name: 'item',
    type: 'number',
    displayOptions: {
      show: {
        operation: [
          'sortItems'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '16',
    default: 0,
    description: 'Primary key of item to move\n',
    required: true
  },
  {
    displayName: 'Collection',
    name: 'collection',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'sortItems'
        ],
        resource: [
          'utils'
        ]
      }
    },
    placeholder: '"articles"',
    default: '',
    description: 'Collection identifier\n',
    required: true
  }
] as INodeProperties[];

