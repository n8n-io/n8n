import {
  CompanyFilesProperties,
} from '../../Interfaces';

export const companyFilesGetDescription: CompanyFilesProperties = [
  {
    displayName: 'File ID',
    name: 'fileId',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'get'
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
