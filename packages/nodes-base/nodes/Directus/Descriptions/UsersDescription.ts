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
    displayName: 'Data (JSON)',
    name: 'data',
    type: 'json',
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
    placeholder: '{\n	"email": "another@example.com",\n	"password": "d1r3ctu5",\n	"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"\n}',
    default: {},
    description: 'A partial [user object](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
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
          'users'
        ]
      }
    },
    placeholder: '"72a1ce24-4748-47de-a05f-ce9af3033727"',
    default: '',
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
    default: {},
    description: 'A partial [user object](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
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
          'users'
        ]
      }
    },
    placeholder: '"72a1ce24-4748-47de-a05f-ce9af3033727"',
    default: '',
    description: 'Primary key of the user.\n',
    required: true
  },
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
    placeholder: '"another@example.com"',
    default: '',
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
    placeholder: '"c86c2761-65d3-43c3-897f-6f74ad6a5bd7"',
    default: '',
    description: 'Role of the new user.\n',
    required: true
  },
  {
    displayName: 'Invite URL',
    name: 'inviteUrl',
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
    placeholder: '',
    default: '',
    description: 'Provide a custom invite url which the link in the email will lead to. The invite token will be passed as a parameter.\nNote: You need to configure the [`USER_INVITE_URL_ALLOW_LIST` environment variable](https://docs.directus.io/reference/environment-variables/#security) to enable this feature.\n',
    required: true
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
    default: {},
    description: 'Update the currently authenticated user.\n',
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
          'users'
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
    default: '',
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
    default: '',
    description: 'Accept invite token.\n',
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
    placeholder: '"123456"',
    default: '',
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
    placeholder: '"3CtiutsNBmY3szHE"',
    default: '',
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
    placeholder: '"859014"',
    default: '',
    description: 'One-time password generated by the authenticator app.\n',
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
    placeholder: '"d1r3ctu5"',
    default: '',
    description: 'The user\'s password.	\n',
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
    default: {},
    description: 'An array of user primary keys\n',
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
          'users'
        ]
      }
    },
    placeholder: '"72a1ce24-4748-47de-a05f-ce9af3033727"',
    default: '',
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
          'updateMultiple'
        ],
        resource: [
          'users'
        ]
      }
    },
    placeholder: '{\n	"keys": ["72a1ce24-4748-47de-a05f-ce9af3033727", "9c3d75a8-7a5f-41a4-be0a-1488fd974511"],\n	"data": {\n		"title": "CTO"\n	}\n}',
    default: {},
    description: 'Required:\n- **`keys`** [Array of primary keys of the users you\'d like to update.]\n- **`data`** [Any of [the user object](https://docs.directus.io/reference/api/system/users/#the-user-object)\'s properties.]\n',
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
          'users'
        ]
      }
    },
    placeholder: '[\n	{\n		"email": "admin@example.com",\n		"password": "p455w0rd",\n		"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"\n	},\n	{\n		"email": "another@example.com",\n		"password": "d1r3ctu5",\n		"role": "c86c2761-65d3-43c3-897f-6f74ad6a5bd7"\n	}\n]',
    default: {},
    description: 'An array of partial [user objects](https://docs.directus.io/reference/api/system/users/#the-user-object).\n',
    required: true
  }
] as INodeProperties[];

