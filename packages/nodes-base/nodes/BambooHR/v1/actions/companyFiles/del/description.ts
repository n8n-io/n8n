import {
  CompanyFilesProperties,
} from '../../Interfaces';

export const companyFilesDelDescription: CompanyFilesProperties = [
  {
    displayName: 'File ID',
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
