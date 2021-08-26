import {
	INodeProperties,
} from 'n8n-workflow';

export const assetsOperations = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'assets'
        ]
      }
    },
    options: [
      {
        name: 'Get',
        value: 'get',
        description: 'Image typed files can be dynamically resized and transformed to fit any need.'
      }
    ],
    default: 'get',
    description: 'The operation to perform.'
  }
] as INodeProperties[];

export const assetsFields = [
  {
    displayName: 'JSON/RAW Parameters',
    name: 'jsonParameters',
    type: 'boolean',
    displayOptions: {
      show: {
        operation: [
          'get'
        ],
        resource: [
          'assets'
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
          'get'
        ],
        resource: [
          'assets'
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
          'get'
        ],
        resource: [
          'assets'
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
        displayName: 'Download',
        name: 'download',
        type: 'boolean',
        placeholder: '',
        default: false,
        description: 'Download the asset to your computer\n',
        required: false
      },
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'The ID of the file.\n',
        required: false
      },
      {
        displayName: 'Key',
        name: 'key',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'The key of the asset size configured in settings.\n',
        required: false
      },
      {
        displayName: 'Transforms',
        name: 'transforms',
        type: 'string',
        placeholder: '',
        default: '',
        description: 'A JSON array of image transformations\n',
        required: false
      }
    ]
  }
] as INodeProperties[];

