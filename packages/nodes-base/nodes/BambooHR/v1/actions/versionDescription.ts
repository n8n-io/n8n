import {
	INodeTypeDescription,
} from 'n8n-workflow';

import * as file from './file';
import * as employee from './employee';
import * as employeeDocument from './employeeDocument';
import * as companyReport from './companyReport';

export const versionDescription: INodeTypeDescription = {
	credentials: [
		{
			name: 'bambooHRApi',
			required: true,
			testedBy: 'bambooHrApiCredentialTest',
		},
	],
	defaults: {
		name: 'BambooHR',
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
					name: 'Company Report',
					value: 'companyReport',
				},
				{
					name: 'Employee',
					value: 'employee',
				},
				{
					name: 'Employee Document',
					value: 'employeeDocument',
				},
				{
					name: 'File',
					value: 'file',
				},
			],
			default: 'employee',
		},
		...employee.descriptions,
		...employeeDocument.descriptions,
		...file.descriptions,
		...companyReport.descriptions,
	],
	subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
	version: 1,
};