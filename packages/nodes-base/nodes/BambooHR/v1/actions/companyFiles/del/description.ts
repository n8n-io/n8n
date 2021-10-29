import {
  CompanyFilesProperties,
} from '../../Interfaces';

export const companyFilesDelDescription: CompanyFilesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'del'
        ],
        resource: [
          'companyFiles',
        ],
      },
    },
    default: '',
    description: 'Company name',
  },
  {
    displayName: 'File Id',
    name: 'fileId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'del'
        ],
        resource: [
          'companyFiles',
        ],
      },
    },
    default: '',
    description: 'ID of the company file',
  },
];
