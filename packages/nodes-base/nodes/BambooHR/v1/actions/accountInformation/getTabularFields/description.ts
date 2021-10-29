import {
  AccountInformationProperties,
} from '../../Interfaces';

export const accountInformationGetTabularFieldsDescription: AccountInformationProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getTabularFields'
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
