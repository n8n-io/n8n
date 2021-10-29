import * as getDetailsForFields from './getDetailsForFields';
import * as getFields from './getFields';
import * as getTabularFields from './getTabularFields';
import * as getUsers from './getUsers';
import * as updateFields from "./updateFields";

import { INodeProperties } from 'n8n-workflow';

export {
  getDetailsForFields,
  getFields,
  getTabularFields,
  getUsers,
  updateFields
};


export const descriptions = [
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: {
        resource: [
          'accountInformation',
        ],
      },
    },
    options: [
      {
        name: 'Get Details For Fields',
        value: 'getDetailsForFields',
        description: 'Details for all list fields',
      },
      {
        name: 'Get Fields',
        value: 'getFields',
        description: 'Discover the fields that are available in an account',
      },
      {
        name: 'Get Tabular Fields',
        value: 'getTabularFields',
        description: 'Discover the table fields available in your BambooHR account.',
      },
      {
        name: 'Get Users',
        value: 'getUsers',
        description: 'Get a List of Users',
      },
      {
        name: 'Add or Update Fields',
        value: 'updateFields',
        description: 'Add or Update Values for List Fields',
      },
    ],
    default: 'getFields',
    description: '',
  },
  ...getDetailsForFields.description,
  ...getFields.description,
  ...getTabularFields.description,
  ...getUsers.description,
  ...updateFields.description
] as INodeProperties[];