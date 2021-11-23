import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffEstimateFutureTimeDescription: TimeOffProperties = [
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
    description: 'Date-Time | e.g. 2021-11-04',
  },
];
