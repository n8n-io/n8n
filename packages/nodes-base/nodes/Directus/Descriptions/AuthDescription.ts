import {
	INodeProperties,
} from 'n8n-workflow';

export const authOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'auth'
        ]
      }
    },
    options: [
      {
        name: 'List',
        value: 'list',
        description: 'List configured OAuth providers.'
      },
      {
        name: 'Login',
        value: 'login',
        description: 'Retrieve a Temporary Access Token'
      },
      {
        name: 'Log Out',
        value: 'logout',
        description: 'Log Out'
      },
      {
        name: 'Refresh Token',
        value: 'refreshToken',
        description: 'Refresh a Temporary Access Token.'
      },
      {
        name: 'Request Password Reset',
        value: 'requestReset',
        description: 'Request a reset password email to be send.'
      },
      {
        name: 'Reset Password',
        value: 'resetPassword',
        description: 'The request a password reset endpoint sends an email with a link to the admin app which in turn uses this endpoint to allow the user to reset their password.'
      },
      {
        name: 'Start OAuth Flow',
        value: 'startOauthFlow',
        description: 'Start OAuth flow using the specified provider'
      }
    ],
    default: 'list',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const authFields = [
  {
    displayName: 'Password',
    name: 'password',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'login'
        ],
        resource: [
          'auth'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'password',
    default: null,
    description: 'Password of the user.\n',
    required: true
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'login'
        ],
        resource: [
          'auth'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'admin@example.com',
    default: null,
    description: 'Email address of the user you\'re retrieving the access token for.\n',
    required: true
  },
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'login'
        ],
        resource: [
          'auth'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'JSON/RAW Parameters',
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
          'login'
        ],
        resource: [
          'auth'
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
          'login'
        ],
        resource: [
          'auth'
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
        displayName: 'Mode',
        name: 'mode',
        type: 'options',
        placeholder: 'Select an option',
        default: 'cookie',
        description: 'Choose between retrieving the token as a string, or setting it as a cookie.\n',
        required: false,
        options: [
          {
            name: 'Cookie',
            value: 'cookie',
            description: 'Cookie'
          },
          {
            name: 'JSON',
            value: 'json',
            description: 'JSON'
          }
        ]
      },
      {
        displayName: 'OTP',
        name: 'otp',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'If 2FA is enabled, you need to pass the one time password.\n',
        required: false
      }
    ]
  },
  {
    displayName: 'Refresh Token',
    name: 'refreshToken',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'refreshToken'
        ],
        resource: [
          'auth'
        ]
      }
    },
    placeholder: 'eyJ0eXAiOiJKV...',
    default: null,
    description: 'JWT access token you want to refresh. This token can\'t be expired.\n',
    required: true
  },
  {
    displayName: 'Refresh Token',
    name: 'refreshToken',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'logout'
        ],
        resource: [
          'auth'
        ]
      }
    },
    placeholder: 'eyJ0eXAiOiJKV...',
    default: null,
    description: 'JWT access token you want to logout.\n',
    required: true
  },
  {
    displayName: 'Email',
    name: 'email',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'requestReset'
        ],
        resource: [
          'auth'
        ]
      }
    },
    placeholder: 'admin@example.com',
    default: null,
    description: 'Email address of the user you\'re requesting a reset for.\n',
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
          'requestReset'
        ],
        resource: [
          'auth'
        ]
      }
    },
    options: [
      {
        displayName: 'Reset URL',
        name: 'resetUrl',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Provide a custom reset url which the link in the email will lead to. The reset token will be passed as a parameter.\nNote: You need to configure the [`PASSWORD_RESET_URL_ALLOW_LIST` environment variable](https://docs.directus.io/reference/environment-variables/#security) to enable this feature.\n',
        required: false
      }
    ]
  },
  {
    displayName: 'Token',
    name: 'token',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'resetPassword'
        ],
        resource: [
          'auth'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'eyJ0eXAiOiJKV1Qi...',
    default: null,
    description: 'One-time use JWT token that is used to verify the user.\n',
    required: true
  },
  {
    displayName: 'Password',
    name: 'password',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'resetPassword'
        ],
        resource: [
          'auth'
        ]
      },
      hide: {
        jsonParameters: [
          true
        ]
      }
    },
    placeholder: 'password',
    default: null,
    description: 'New password for the user.\n',
    required: true
  },
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'resetPassword'
        ],
        resource: [
          'auth'
        ]
      }
    },
    placeholder: '',
    default: false,
    description: 'JSON/RAW Parameters',
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
          'resetPassword'
        ],
        resource: [
          'auth'
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
          'auth'
        ]
      }
    }
  },
  {
    displayName: 'Provider',
    name: 'provider',
    type: 'string',
    displayOptions: {
      show: {
        operation: [
          'startOauthFlow'
        ],
        resource: [
          'auth'
        ]
      }
    },
    placeholder: '',
    default: null,
    description: 'Key of the activated OAuth provider.\n',
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
          'startOauthFlow'
        ],
        resource: [
          'auth'
        ]
      }
    },
    options: [
      {
        displayName: 'Redirect',
        name: 'redirect',
        type: 'string',
        placeholder: '',
        default: null,
        description: 'Where to redirect on successful login.<br/>If set the authentication details are set inside cookies otherwise a JSON is returned.\n',
        required: false
      }
    ]
  }
] as INodeProperties[];

