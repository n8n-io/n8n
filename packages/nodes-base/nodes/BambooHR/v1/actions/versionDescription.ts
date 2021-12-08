import {
  INodeTypeDescription,
} from 'n8n-workflow';
import * as employees from './employees';
import * as employeeFile from './employeeFile';
import * as companyFile from './companyFile';
import * as reports from './reports';
import * as tabularData from './tabularData';
import * as timeOff from './timeOff';

export const versionDescription: INodeTypeDescription = {
  displayName: 'BambooHR',
  name: 'bambooHR',
  icon: 'file:bambooHR.png',
  group: ['transform'],
  version: 1,
	subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
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
          name: 'Employee',
          value: 'employees',
        },
        {
          name: 'Employee File',
          value: 'employeeFile',
        },
        {
          name: 'Company File',
          value: 'companyFile',
        },
        {
          name: 'Company Report',
          value: 'reports',
        },
        {
          name: 'Tabular Data',
          value: 'tabularData',
        },
        {
          name: 'Time Off',
          value: 'timeOff',
        },
      ],
      default: 'employees',
      description: 'The resource to operate on',
    },
    ...employees.descriptions,
    ...employeeFile.descriptions,
    ...companyFile.descriptions,
    ...reports.descriptions,
    ...tabularData.descriptions,
    ...timeOff.descriptions
  ],
};
