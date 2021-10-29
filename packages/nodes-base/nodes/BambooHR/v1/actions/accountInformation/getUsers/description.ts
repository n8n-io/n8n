import {
  AccountInformationProperties,
} from '../../Interfaces';

export const accountInformationGetUsersDescription: AccountInformationProperties = [
  {
    displayName: 'Company Name',
    name: 'companyName',
    type: 'string',
    required: true,
    displayOptions: {
      show: {
        operation: [
          'getUsers'
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
