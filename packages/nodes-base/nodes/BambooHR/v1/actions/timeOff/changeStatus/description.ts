import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffChangeStatusDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'changeStatus'
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
    displayName: 'Request ID',
    name: 'requestId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'changeStatus'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'Request ID',
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
          'changeStatus'
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
        default: 'approved',
        description: 'Request Status. Choose one of: approved, cancelled, denied',
      },
      {
        displayName: 'Note',
        name: 'note',
        type: 'string',
        default: 'Note!',
        description: 'A note to attach to the change in status',
      },
    ],
  }
];
