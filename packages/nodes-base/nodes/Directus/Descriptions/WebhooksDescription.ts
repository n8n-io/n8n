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
    placeholder: 'Build Website',
    default: null,
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
    displayName: 'Collections',
    name: 'collections',
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
    placeholder: '["articles"]',
    default: [],
    description: 'What collections to fire this webhook on.\n',
    required: true,
    typeOptions: {
      loadOptionsMethod: 'getCustomCollections'
    }
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
    placeholder: 'https://example.com/',
    default: null,
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
    typeOptions: {
      alwaysOpenEditWindow: true
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
    default: null,
    description: 'An array of partial [webhook object](https://docs.directus.io/reference/api/system/webhooks/#the-webhook-object).\n`name`, `actions`, `collections`, and `url` are required.\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
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
    default: null,
    description: 'Primary key of the webhook.\n',
    required: true
  },
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: [
          'webhooks'
        ],
        operation: [
          'list'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    default: true,
    description: 'If all results should be returned or only up to a given limit.',
    required: true
  },
  {
    displayName: 'Limit',
    name: 'limit',
    type: 'number',
    displayOptions: {
      show: {
        operation: [
          'list'
        ],
        resource: [
          'webhooks'
        ],
        returnAll: [
          false
        ]
      }
    },
    placeholder: '',
    default: 50,
    description: 'A limit on the number of objects that are returned.\n',
    required: true,
    typeOptions: {
      minValue: 1,
      maxValue: 100
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
          'webhooks'
        ]
      }
    }
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
          'list'
        ],
        resource: [
          'webhooks'
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
          'list'
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
    options: [
      {
        displayName: 'Aggregate',
        name: 'aggregate',
        type: 'fixedCollection',
        placeholder: 'Add Aggregation Functions',
        default: '',
        description: 'Aggregate functions allow you to perform calculations on a set of values, returning a single result.\n',
        required: false,
        typeOptions: {
          multipleValues: true
        },
        options: [
          {
            name: 'aggregationFunctions',
            displayName: 'Functions',
            values: [
              {
                displayName: 'Name',
                name: 'name',
                type: 'options',
                default: 'count',
                options: [
                  {
                    name: 'Count',
                    value: 'count',
                    description: 'Counts how many items there are'
                  },
                  {
                    name: 'Count Distinct',
                    value: 'countDistinct',
                    description: 'Counts how many unique items there are'
                  },
                  {
                    name: 'SUM',
                    value: 'sum',
                    description: 'Adds together the values in the given field'
                  },
                  {
                    name: 'SUM Distinct',
                    value: 'sumDistinct',
                    description: 'Adds together the unique values in the given field'
                  },
                  {
                    name: 'Average',
                    value: 'avg',
                    description: 'Get the average value of the given field'
                  },
                  {
                    name: 'Average Distinct',
                    value: 'avgDistinct',
                    description: 'Get the average value of the unique values in the given field'
                  },
                  {
                    name: 'Minimum',
                    value: 'min',
                    description: 'Return the lowest value in the field'
                  },
                  {
                    name: 'Maximum',
                    value: 'max',
                    description: 'Return the highest value in the field'
                  }
                ],
                description: 'Aggregation Function'
              },
              {
                displayName: 'Field',
                name: 'value',
                type: 'options',
                default: '',
                description: 'Field to apply aggregation on',
                typeOptions: {
                  loadOptionsMethod: 'getFieldsInCollection'
                }
              }
            ]
          }
        ]
      },
      {
        displayName: 'Binary Property for Export Data',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        description: 'Name of the binary property to download the data to.'
      },
      {
        displayName: 'Deep (JSON)',
        name: 'deep',
        type: 'json',
        placeholder: '',
        default: null,
        description: 'Deep allows you to set any of the other query parameters on a nested relational dataset.\n',
        required: false,
        typeOptions: {
          alwaysOpenEditWindow: true
        }
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
        default: null,
        description: 'Control what fields are being returned in the object.\n',
        required: false
      },
      {
        displayName: 'File Name for Export Data',
        name: 'fileName',
        type: 'string',
        default: 'export',
        description: 'File Name for the Export data without the extension'
      },
      {
        displayName: 'Filter (JSON)',
        name: 'filter',
        type: 'json',
        placeholder: '',
        default: null,
        description: 'Select items in collection by given conditions.\n',
        required: false,
        typeOptions: {
          alwaysOpenEditWindow: true
        }
      },
      {
        displayName: 'Group By',
        name: 'groupBy',
        type: 'string',
        placeholder: 'author,year(publish_date)',
        default: null,
        description: 'Grouping allows for running the aggregation functions based on a shared value. This allows for things like "Average rating per month" or "Total sales of items in the jeans category".\n',
        required: false
      },
      {
        displayName: 'Meta',
        name: 'meta',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'What metadata to return in the response.\n',
        required: false
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        placeholder: '',
        default: null,
        description: 'How many items to skip when fetching data.\n',
        required: false
      },
      {
        displayName: 'Search',
        name: 'search',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Filter by items that contain the given search query in one of their fields.\n',
        required: false
      },
      {
        displayName: 'Sort',
        name: 'sort',
        type: 'string',
        placeholder: '',
        default: null,
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
          'webhooks'
        ]
      }
    },
    placeholder: '{\n	"keys": [15, 41],\n	"data": {\n		"name": "Build Website"\n	}\n}',
    default: null,
    description: 'Required:\n- **`keys`** [Array of primary keys of the webhooks you\'d like to update]\n- **`data`** [Any of [the webhook object](https://docs.directus.io/reference/api/system/webhooks/#the-webhook-object)\'s properties]\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
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
    default: null,
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
    default: null,
    description: 'A partial [webhook object](https://docs.directus.io/reference/api/system/webhooks/#the-webhook-object).\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
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
    default: null,
    description: 'An array of webhook primary keys.\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
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
    default: null,
    description: 'Primary key of the webhook.\n',
    required: true
  }
] as INodeProperties[];

