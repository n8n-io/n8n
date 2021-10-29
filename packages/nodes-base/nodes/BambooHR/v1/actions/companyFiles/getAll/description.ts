import {
  CompanyFilesProperties,
} from '../../Interfaces';

export const companyFilesGetAllDescription: CompanyFilesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getAll'
        ],
        resource: [
          'companyFiles',
        ],
      },
    },
    default: '',
    description: 'Company name',
  }
];
