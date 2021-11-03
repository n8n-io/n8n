import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffGetEmployeePoliciesDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getEmployeePolicies'
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
          'getEmployeePolicies'
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
