import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffCreateRequestDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'createRequest'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  {
    displayName: 'Employee ID',
    name: 'employeeId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'createRequest'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'Employee ID',
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
          'createRequest'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    options: [
      {
        displayName: 'Status',
        name: 'status',
        type: 'string',
        default: '',
        description: 'The possible status values are: "approved", "denied" (or "declined"), "requested"',
      },
      {
        displayName: 'Start',
        name: 'start',
        type: 'string',
        default: '',
        description: 'Start',
      },
      {
        displayName: 'End',
        name: 'end',
        type: 'string',
        default: '',
        description: 'End',
      },
      {
        displayName: 'Time Off Type ID',
        name: 'timeOffTypeId',
        type: 'string',
        default: '',
        description: 'Time Off Type ID',
      },
      {
        displayName: 'Amount',
        name: 'amount',
        type: 'string',
        default: '',
        description: 'Amount',
      }
    ],
  }
];
