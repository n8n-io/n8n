import {
  AccountInformationProperties,
} from '../../Interfaces';

export const accountInformationGetDetailsForFieldsDescription: AccountInformationProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getDetailsForFields'
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
