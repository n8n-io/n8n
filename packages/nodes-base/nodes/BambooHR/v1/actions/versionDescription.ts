import {
	INodeTypeDescription,
} from 'n8n-workflow';
import * as companyFile from './companyFile';
import * as employee from './employee';
import * as employeeFile from './employeeFile';
import * as report from './report';
import * as tabularData from './tabularData';
import * as timeOff from './timeOff';

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
					name: 'Employee',
					value: 'employee',
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
					value: 'report',
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
			default: 'employee',
		},
		...employee.descriptions,
		...employeeFile.descriptions,
		...companyFile.descriptions,
		...report.descriptions,
		...tabularData.descriptions,
		...timeOff.descriptions,
	],
	subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
	version: 1,
};
