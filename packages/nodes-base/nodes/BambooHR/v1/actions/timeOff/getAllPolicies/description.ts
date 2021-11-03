import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffGetAllPoliciesDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getAllPolicies'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'Company name',
  }
];
