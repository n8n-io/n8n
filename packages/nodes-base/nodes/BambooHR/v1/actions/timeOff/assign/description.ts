import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffAssignDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'assign'
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
          'assign'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'Employee ID',
  }
];
