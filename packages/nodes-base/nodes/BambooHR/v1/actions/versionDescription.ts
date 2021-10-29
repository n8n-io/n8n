import {
  INodeTypeDescription,
} from 'n8n-workflow';
import * as employees from './employees';
import * as employeeFiles from './employeeFiles';
import * as companyFiles from './companyFiles';
import * as reports from './reports';
import * as accountInformation from './accountInformation';

export const versionDescription: INodeTypeDescription = {
  displayName: 'BambooHR',
  name: 'bambooHR',
  icon: 'file:bambooHR.svg',
  group: ['transform'],
  version: 1,
  description: 'Consume BambooHR API',
  defaults: {
    name: 'BambooHR',
    color: '#73c41d',
  },
  inputs: ['main'],
  outputs: ['main'],
  credentials: [
    {
      name: 'bambooHRApi',
      required: true,
    },
  ],
  properties: [
    {
      displayName: 'Resource',
      name: 'resource',
      type: 'options',
      options: [
        {
          name: 'Employees',
          value: 'employees',
        },
        {
          name: 'Employee Files',
          value: 'employeeFiles',
        },
        {
          name: 'Company Files',
          value: 'companyFiles',
        },
        {
          name: 'Company Reports',
          value: 'reports',
        },
        {
          name: 'Account Information',
          value: 'accountInformation',
        },
      ],
      default: 'employees',
      description: 'The resource to operate on',
    },
    ...employees.descriptions,
    ...employeeFiles.descriptions,
    ...companyFiles.descriptions,
    ...reports.descriptions,
    ...accountInformation.descriptions
  ],
};
