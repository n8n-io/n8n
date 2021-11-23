import {
  TabularDataProperties,
} from '../../Interfaces';

export const tabularDataGetDescription: TabularDataProperties = [
  {
    displayName: 'Employee ID',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get'
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
          'get'
        ],
        resource: [
          'tabularData',
        ],
      },
    },
    default: '',
    description: 'Name of the table',
  }
];
