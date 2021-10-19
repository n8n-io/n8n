import {
	INodeProperties,
} from 'n8n-workflow';

export const usersOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'users'
        ]
      }
    },
    options: [
      {
        name: 'Accept User Invite',
        value: 'acceptUserInvite',
        description: 'Accepts and enables an invited user using a JWT invitation token.'
      },
      {
        name: 'Create',
        value: 'create',
        description: 'Create a new user.'
      },
      {
        name: 'Create Multiple',
        value: 'createMultiple',
        description: 'Create Multiple Users'
      },
      {
        name: 'Delete',
        value: 'delete',
        description: 'Delete an existing user'
      },
      {
        name: 'Delete Multiple',
        value: 'deleteMultiple',
        description: 'Delete Multiple Users'
      },
      {
        name: 'Disable 2FA',
        value: 'disable2FA',
        description: 'Disables two-factor authentication for the currently authenticated user.'
      },
      {
        name: 'Enable 2FA',
        value: 'enable2FA',
        description: 'Enables two-factor authentication for the currently authenticated user.'
      },
      {
        name: 'Generate 2FA',
        value: 'generate2FA',
        description: 'Generate 2FA Secret'
      },
      {
        name: 'Get',
        value: 'get',
        description: 'Retrieve a single user by unique identifier.'
      },
      {
        name: 'Get Current',
        value: 'getCurrent',
        description: 'Retrieve the currently authenticated user.'
      },
      {
        name: 'Invite User',
        value: 'inviteUser',
        description: 'Invites one or more users to this project. It creates a user with an invited status, and then sends an email to the user with instructions on how to activate their account.'
      },
      {
        name: 'List',
        value: 'list',
        description: 'List the users.'
      },
      {
        name: 'Update',
        value: 'update',
        description: 'Update an existing user'
      },
      {
        name: 'Update Me',
        value: 'updateMe',
        description: 'Update the currently authenticated user.'
      },
      {
        name: 'Update Multiple',
        value: 'updateMultiple',
        description: 'Update Multiple Users'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const usersFields = [
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'inviteUser'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: 'another@example.com',
    default: null,
    description: 'User email to invite.\n',
    required: true
  },
  {
    displayName: 'Role',
    name: 'role',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'inviteUser'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: 'c86c2761-65d3-43c3-897f-6f74ad6a5bd7',
    default: null,
    description: 'Role of the new user.\n',
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
          'inviteUser'
        ],
        resource: [
          'users'
        ]
      }
    },
    options: [
      {
        displayName: 'Invite URL',
        name: 'inviteUrl',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Provide a custom invite url which the link in the email will lead to. The invite token will be passed as a parameter.\nNote: You need to configure the [`USER_INVITE_URL_ALLOW_LIST` environment variable](https://docs.directus.io/reference/environment-variables/#security) to enable this feature.\n',
        required: false
      }
    ]
  },
  {
    displayName: 'Password',
    name: 'password',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'acceptUserInvite'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: 'd1r3ctu5',
    default: null,
    description: 'Password of the user.\n',
    required: true
  },
  {
    displayName: 'Token',
    name: 'token',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'acceptUserInvite'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: 'eyJh...KmUk',
    default: null,
    description: 'Accept invite token.\n',
    required: true
  },
  {
    displayName: 'Password',
    name: 'password',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'generate2FA'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: 'd1r3ctu5',
    default: null,
    description: 'The user\'s password of the currently authenticated user.\n',
    required: true
  },
  {
    displayName: 'Secret',
    name: 'secret',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'enable2FA'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '123456',
    default: null,
    description: 'The TFA secret from tfa/generate.\n',
    required: true
  },
  {
    displayName: 'OTP',
    name: 'otp',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'enable2FA'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '3CtiutsNBmY3szHE',
    default: null,
    description: 'OTP generated with the secret, to recheck if the user has a correct TFA setup\n',
    required: true
  },
  {
    displayName: 'OTP',
    name: 'otp',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'disable2FA'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '859014',
    default: null,
    description: 'One-time password generated by the authenticator app.\n',
    required: true
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'users'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'another@example.com',
    default: null,
    description: 'A partial [user object](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
    required: true
  },
  {
    displayName: 'Password',
    name: 'password',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'users'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'd1r3ctu5',
    default: null,
    description: 'A partial [user object](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
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
          'users'
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
          'users'
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
          'users'
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
        displayName: 'Avatar',
        name: 'avatar',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Avatar file. Many-to-one to [files](https://docs.directus.io/reference/api/system/files/).\n',
        required: false
      },
      {
        displayName: 'Description',
        name: 'description',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Description of the user.\n',
        required: false
      },
      {
        displayName: 'First Name',
        name: 'first_name',
        type: 'string',
        placeholder: 'Admin',
        default: null,
        description: 'First name of the user.\n',
        required: false
      },
      {
        displayName: 'Language',
        name: 'language',
        type: 'string',
        placeholder: 'en-US',
        default: null,
        description: 'Language the Admin App is rendered in. See [our Crowdin page ](https://locales.directus.io/)\n[(opens new window)](https://locales.directus.io/)\nfor all available languages and translations.\n',
        required: false
      },
      {
        displayName: 'Last Name',
        name: 'last_name',
        type: 'string',
        placeholder: 'User',
        default: null,
        description: 'Last name of the user.\n',
        required: false
      },
      {
        displayName: 'Location',
        name: 'location',
        type: 'string',
        placeholder: 'New York City',
        default: null,
        description: 'Location of the user.\n',
        required: false
      },
      {
        displayName: 'Role',
        name: 'role',
        type: 'options',
        placeholder: '',
        default: null,
        description: 'Role of the User.\n',
        required: false,
        typeOptions: {
          loadOptionsMethod: 'getRoles'
        }
      },
      {
        displayName: 'Tags',
        name: 'tags',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Tags for the user.\n',
        required: false
      },
      {
        displayName: 'TFA Secret',
        name: 'tfa_secret',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'TFA Secret',
        required: false
      },
      {
        displayName: 'Theme',
        name: 'theme',
        type: 'options',
        placeholder: 'Select an option',
        default: 'auto',
        description: 'One of auto, light, dark.\n',
        required: false,
        options: [
          {
            name: 'Auto',
            value: 'auto',
            description: ''
          },
          {
            name: 'Dark',
            value: 'dark',
            description: ''
          },
          {
            name: 'Light',
            value: 'light',
            description: ''
          }
        ]
      },
      {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        placeholder: 'CTO',
        default: null,
        description: 'Title of the user.\n',
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
          'createMultiple'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '[\n	{\n		"email": "admin@example.com",\n		"password": "p455w0rd",\n		"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"\n	},\n	{\n		"email": "another@example.com",\n		"password": "d1r3ctu5",\n		"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"\n	}\n]',
    default: null,
    description: 'An array of partial [user objects](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
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
          'users'
        ]
      }
    },
    placeholder: '72a1ce24-4748-47de-a05f-ce9af3033727',
    default: null,
    description: 'Primary key of the user.\n',
    required: true
  },
  {
    displayName: 'Return All',
    name: 'returnAll',
    type: 'boolean',
    displayOptions: {
      show: {
        resource: [
          'users'
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
          'users'
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
          'users'
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
          'users'
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
          'users'
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
          'users'
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
    displayName: 'ID',
    name: 'id',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '72a1ce24-4748-47de-a05f-ce9af3033727',
    default: null,
    description: 'Primary key of the user.\n',
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
          'users'
        ]
      }
    },
    placeholder: '{\n	"title": "CTO"\n}',
    default: null,
    description: 'A partial [user object](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
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
          'updateMultiple'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '{\n	"keys": ["72a1ce24-4748-47de-a05f-ce9af3033727", "9c3d75a8-7a5f-41a4-be0a-1488fd974511"],\n	"data": {\n		"title": "CTO"\n	}\n}',
    default: null,
    description: 'Required:\n- **`keys`** [Array of primary keys of the users you\'d like to update.]\n- **`data`** [Any of [the user object](https://docs.directus.io/reference/api/system/users/#the-user-object)\'s properties.]\n',
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
          'users'
        ]
      }
    },
    placeholder: '72a1ce24-4748-47de-a05f-ce9af3033727',
    default: null,
    description: 'Primary key of the user.\n',
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
          'users'
        ]
      }
    },
    placeholder: '["653925a9-970e-487a-bfc0-ab6c96affcdc", "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"]',
    default: null,
    description: 'An array of user primary keys\n',
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
          'updateMe'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '{\n	"title": "CTO"\n}',
    default: null,
    description: 'Update the currently authenticated user.\n',
    required: true,
    typeOptions: {
      alwaysOpenEditWindow: true
    }
  }
] as INodeProperties[];

