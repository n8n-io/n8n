import {
  TabularDataProperties,
} from '../../Interfaces';

export const tabularDataCreateDescription: TabularDataProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
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
    displayName: 'ID',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'Employee ID',
  },
  {
    displayName: 'Table Name',
    name: 'table',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
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
          'tabularData',
        ],
      },
    },
    options: [
      {
        displayName: 'Data',
        name: 'date',
        type: 'string',
        default: '',
        description: 'Date',
      },
      {
        displayName: 'Location',
        name: 'location',
        type: 'string',
        default: '',
        description: 'Location',
      },
      {
        displayName: 'Division',
        name: 'division',
        type: 'string',
        default: '',
        description: 'Division',
      },
      {
        displayName: 'Department',
        name: 'department',
        type: 'string',
        default: '',
        description: 'Department',
      },
      {
        displayName: 'Job Title',
        name: 'jobTitle',
        type: 'string',
        default: '',
        description: 'Job Title',
      },
      {
        displayName: 'Reports To',
        name: 'reportsTo',
        type: 'string',
        default: '',
        description: 'Reports To',
      },
    ],
  }
];
