import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffGetEmployeeOutDescription: TimeOffProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getEmployeeOut'
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
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    placeholder: 'Add Field',
    default: {},
    displayOptions: {
      show: {
        operation: [
          'getEmployeeOut'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    options: [
      {
        displayName: 'Start',
        name: 'start',
        type: 'string',
        default: '',
        description: 'A date in the form YYYY-MM-DD - defaults to the current date.',
      },
      {
        displayName: 'End',
        name: 'end',
        type: 'string',
        default: '',
        description: 'A date in the form YYYY-MM-DD - defaults to 14 days from the start date.',
      }
    ],
  }
];
