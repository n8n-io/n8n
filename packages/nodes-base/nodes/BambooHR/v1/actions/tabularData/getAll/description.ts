import {
  TabularDataProperties,
} from '../../Interfaces';

export const tabularDataGetAllDescription: TabularDataProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getAll'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  {
    displayName: 'Table Name',
    name: 'table',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getAll'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'Name of the table',
  },
  {
    displayName: 'Since',
    name: 'since',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getAll'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'URL encoded iso8601 timestamp',
  }
];
