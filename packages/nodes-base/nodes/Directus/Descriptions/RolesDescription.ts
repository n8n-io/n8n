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
          'update'
        ],
        resource: [
          'roles'
        ]
      }
    },
    placeholder: '{\n	"icon": "attractions"\n}',
    default: {},
    description: 'A partial [role object](https://docs.directus.io/reference/api/system/roles/#the-role-object).\n',
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
          'roles'
        ]
      }
    },
    placeholder: '"c86c2761-65d3-43c3-897f-6f74ad6a5bd7"',
    default: '',
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
    placeholder: '"c86c2761-65d3-43c3-897f-6f74ad6a5bd7"',
    default: '',
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
          'create'
        ],
        resource: [
          'roles'
        ]
      }
    },
    placeholder: '{\n	"name": "Interns",\n	"icon": "verified_user",\n	"description": null,\n	"admin_access": false,\n	"app_access": true\n}',
    default: {},
    description: 'A partial [role object](https://docs.directus.io/reference/api/system/roles/#the-role-object).\n',
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
    default: {},
    description: 'An array of partial [role objects](https://docs.directus.io/reference/api/system/roles/#the-role-object).\n',
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
          'roles'
        ]
      }
    },
    placeholder: '["653925a9-970e-487a-bfc0-ab6c96affcdc", "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"]',
    default: {},
    description: 'An array of role primary keys\n',
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
    placeholder: '"c86c2761-65d3-43c3-897f-6f74ad6a5bd7"',
    default: '',
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
          'updateMultiple'
        ],
        resource: [
          'roles'
        ]
      }
    },
    placeholder: '{\n	"keys": ["c86c2761-65d3-43c3-897f-6f74ad6a5bd7", "6fc3d5d3-a37b-4da8-a2f4-ed62ad5abe03"],\n	"data": {\n		"icon": "attractions"\n	}\n}',
    default: {},
    description: 'Required:\n- **`keys`** [Array of primary keys of the roles you\'d like to update.]\n- **`data`** [Any of [the role object](https://docs.directus.io/reference/api/system/roles/#the-role-object)\'s properties.]\n',
    required: true
  }
] as INodeProperties[];

