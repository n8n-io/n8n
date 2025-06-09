import { INodeProperties } from 'n8n-workflow';

// Operations available for the Memory resource
export const memoryOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['memory'],
      },
    },
    options: [
      {
        name: 'Store Memory',
        value: 'store',
        description: 'Store a new memory',
        action: 'Store a new memory',
      },
      {
        name: 'Search Memories',
        value: 'search',
        description: 'Search for memories using semantic search',
        action: 'Search for memories using semantic search',
      },
      {
        name: 'Get All Memories',
        value: 'getAll',
        description: 'Get all memories',
        action: 'Get all memories',
      },
      {
        name: 'Get From Bucket',
        value: 'getFromBucket',
        description: 'Get memories from a bucket',
        action: 'Get memories from a bucket',
      },
    ],
    default: 'store',
  },
];

// Operations available for the Bucket resource
export const bucketOperations: INodeProperties[] = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    noDataExpression: true,
    displayOptions: {
      show: {
        resource: ['bucket'],
      },
    },
    options: [
      {
        name: 'Get All Buckets',
        value: 'getAll',
        description: 'Get all buckets',
        action: 'Get all buckets',
      },
    ],
    default: 'getAll',
  },
];

// Fields for each memory operation
export const memoryFields: INodeProperties[] = [
  // Fields for store operation
  {
    displayName: 'Memory Text',
    name: 'text',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['memory'],
        operation: ['store'],
      },
    },
    default: '',
    description: 'The text content of the memory to store',
  },
  {
    displayName: 'Bucket ID',
    name: 'bucketId',
    type: 'string',
    required: false,
    displayOptions: {
      show: {
        resource: ['memory'],
        operation: ['store', 'getFromBucket'],
      },
    },
    default: '',
    description: 'The bucket to store or retrieve memories from',
  },
  
  // Fields for search operation
  {
    displayName: 'Query',
    name: 'query',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        resource: ['memory'],
        operation: ['search'],
      },
    },
    default: '',
    description: 'The search query to find semantically similar memories',
  },
  {
    displayName: 'Debug Mode',
    name: 'debug',
    type: 'boolean',
    required: false,
    displayOptions: {
      show: {
        resource: ['memory'],
        operation: ['search'],
      },
    },
    default: false,
    description: 'Whether to return debug information with search results',
  },
];
