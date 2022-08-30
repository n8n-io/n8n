/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import { INodeTypeDescription } from 'n8n-workflow';

import * as file from './file';
import * as employee from './employee';
import * as employeeDocument from './employeeDocument';
import * as companyReport from './companyReport';

export const versionDescription: INodeTypeDescription = {
	credentials: [
		{
			name: 'bambooHrApi',
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
	// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
	icon: 'file:bambooHr.png',
	inputs: ['main'],
	name: 'bambooHr',
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
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
