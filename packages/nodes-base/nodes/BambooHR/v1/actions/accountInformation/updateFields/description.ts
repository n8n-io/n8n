import {
  CompanyFilesProperties,
} from '../../Interfaces';

export const companyFilesCreateDescription: CompanyFilesProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
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
    displayName: 'Category Name',
    name: 'categoryName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'create'
        ],
        resource: [
          'companyFiles',
        ],
      },
    },
    default: '',
    description: 'Name of the new company files category',
  },
];
