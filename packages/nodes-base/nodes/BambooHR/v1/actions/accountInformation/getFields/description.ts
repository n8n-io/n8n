import {
  AccountInformationProperties,
} from '../../Interfaces';

export const accountInformationGetFieldsDescription: AccountInformationProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getFields'
        ],
        resource: [
          'accountInformation',
        ],
      },
    },
    default: '',
    description: 'Company name',
  }
];
