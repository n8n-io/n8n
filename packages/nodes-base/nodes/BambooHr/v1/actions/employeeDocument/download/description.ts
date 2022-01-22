import {
	EmployeeDocumentProperties,
} from '../../Interfaces';

export const employeeDocumentDownloadDescription: EmployeeDocumentProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'employeeDocument',
				],
			},
		},
		default: '',
		description: 'ID of the employee',
	},
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'employeeDocument',
				],
			},
		},
		default: '',
		description: 'ID of the employee file',
	},
	{
		displayName: 'Put Output In Field',
		name: 'output',
		type: 'string',
		default: 'data',
		required: true,
		description: 'The name of the output field to put the binary file data in',
		displayOptions: {
			show: {
				operation: [
					'download',
				],
				resource: [
					'employeeDocument',
				],
			},
		},
	},
];
