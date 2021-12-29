import {
	INodeTypeDescription,
} from 'n8n-workflow';
import * as companyFile from './companyFile';
import * as employees from './employees';
import * as employeeFile from './employeeFile';
import * as reports from './reports';
import * as tabularData from './tabularData';
import * as timeOff from './timeOff';

export const versionDescription: INodeTypeDescription = {
	credentials: [
		{
			name: 'bambooHRApi',
			required: true,
		},
	],
	defaults: {
		name: 'BambooHR',
		color: '#73c41d',
	},
	description: 'Consume BambooHR API',
	displayName: 'BambooHR',
	group: ['transform'],
	icon: 'file:bambooHR.png',
	inputs: ['main'],
	name: 'bambooHR',
	outputs: ['main'],
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
		},
		...employees.descriptions,
		...employeeFile.descriptions,
		...companyFile.descriptions,
		...reports.descriptions,
		...tabularData.descriptions,
		...timeOff.descriptions,
	],
	subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
	version: 1,
};
