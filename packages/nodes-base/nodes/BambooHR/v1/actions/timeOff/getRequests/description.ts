import {
  TimeOffProperties,
} from '../../Interfaces';

export const timeOffGetRequestsDescription: TimeOffProperties = [
  {
    displayName: 'Start Date',
    name: 'start',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getRequests'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'YYYY-MM-DD - Only show time off that occurs on/after the specified start date',
  },
  {
    displayName: 'End Date',
    name: 'end',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getRequests'
        ],
        resource: [
          'timeOff',
        ],
      },
    },
    default: '',
    description: 'YYYY-MM-DD - Only show time off that occurs on/before the specified end date',
  },
];
