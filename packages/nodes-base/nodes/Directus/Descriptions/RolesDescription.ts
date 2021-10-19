import {
	INodeProperties,
} from 'n8n-workflow';

export const rolesOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'roles'
        ]
      }
    },
    options: [
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new role.'
      },
      {
        name: 'Create Multiple',
        value: 'createMultiple',
        description: 'Create Multiple Roles'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing role'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete Multiple Roles'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single role by unique identifier.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List the roles.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing role'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Roles'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const rolesFields = [
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: [
          'roles'
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
          'roles'
        ],
        returnAll: [
          false
        ]
      },
      hide: {
        jsonParameters: [
          true
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
          'roles'
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
          'roles'
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
          'roles'
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
          'roles'
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
          'roles'
        ]
      }
    },
    placeholder: '{\n	"keys": ["c86c2761-65d3-43c3-897f-6f74ad6a5bd7", "6fc3d5d3-a37b-4da8-a2f4-ed62ad5abe03"],\n	"data": {\n		"icon": "attractions"\n	}\n}',
    default: null,
    description: 'Required:\n- **`keys`** [Array of primary keys of the roles you\'d like to update.]\n- **`data`** [Any of [the role object](https://docs.directus.io/reference/api/system/roles/#the-role-object)\'s properties.]\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
  },
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
          'roles'
        ]
      }
    },
    placeholder: '{\n	"name": "Interns",\n	"icon": "verified_user",\n	"description": null,\n	"admin_access": false,\n	"app_access": true\n}',
    default: null,
    description: 'A partial [role object](https://docs.directus.io/reference/api/system/roles/#the-role-object).\n',
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
          'roles'
        ]
      }
    },
    placeholder: '["653925a9-970e-487a-bfc0-ab6c96affcdc", "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"]',
    default: null,
    description: 'An array of role primary keys\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
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
          'roles'
        ]
      }
    },
    placeholder: '{\n	"icon": "attractions"\n}',
    default: null,
    description: 'A partial [role object](https://docs.directus.io/reference/api/system/roles/#the-role-object).\n',
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
          'roles'
        ]
      }
    },
    placeholder: 'c86c2761-65d3-43c3-897f-6f74ad6a5bd7',
    default: null,
    description: 'Primary key of the role.\n',
    required: true
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
          'roles'
        ]
      }
    },
    placeholder: 'c86c2761-65d3-43c3-897f-6f74ad6a5bd7',
    default: null,
    description: 'Primary key of the role.\n',
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
          'roles'
        ]
      }
    },
    placeholder: 'c86c2761-65d3-43c3-897f-6f74ad6a5bd7',
    default: null,
    description: 'Primary key of the role.\n',
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
          'roles'
        ]
      }
    },
    placeholder: '[\n	{\n		"name": "Interns",\n		"icon": "verified_user",\n		"description": null,\n		"admin_access": false,\n		"app_access": true\n	},\n	{\n		"name": "Customers",\n		"icon": "person",\n		"description": null,\n		"admin_access": false,\n		"app_access": false\n	}\n]',
    default: null,
    description: 'An array of partial [role objects](https://docs.directus.io/reference/api/system/roles/#the-role-object).\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
  }
] as INodeProperties[];

