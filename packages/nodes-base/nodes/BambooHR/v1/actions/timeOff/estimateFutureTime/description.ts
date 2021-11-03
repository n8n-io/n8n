import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffEstimateFutureTimeDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'estimateFutureTime'
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
          'estimateFutureTime'
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
    displayName: 'End',
    name: 'end',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'estimateFutureTime'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'Date-Time',
  },
];
