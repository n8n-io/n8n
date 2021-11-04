import {
  ReportsProperties,
} from '../../Interfaces';

export const reportsGetDescription: ReportsProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get'
        ],
        resource: [
          'reports',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  {
    displayName: 'Report ID',
    name: 'id',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get',
        ],
        resource: [
          'reports',
        ],
      },
    },
    default: '',
    description: 'Id of the Report. You can get the report number by hovering over the report name on the reports page and grabbing the ID.',
  },
  {
    displayName: 'Format',
    name: 'format',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get',
        ],
        resource: [
          'reports',
        ],
      },
    },
    default: 'JSON',
    description: 'The output format for the report. Supported formats: CSV, PDF, XLS, XML, JSON',
  },
];
