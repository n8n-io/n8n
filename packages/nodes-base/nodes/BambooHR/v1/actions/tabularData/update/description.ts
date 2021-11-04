import {
  TabularDataProperties,
} from '../../Interfaces';

export const tabularDataUpdateDescription: TabularDataProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
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
    displayName: 'Employee ID',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
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
          'update'
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
    displayName: 'Row ID',
    name: 'rowId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'Row ID',
  },
  {
    displayName: 'Location',
    name: 'location',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'update'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'Location',
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
          'update'
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
