import { EmployeeDocumentProperties } from '../../Interfaces';

export const employeeDocumentDelDescription: EmployeeDocumentProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['delete'],
				resource: ['employeeDocument'],
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
				operation: ['delete'],
				resource: ['employeeDocument'],
			},
		},
		default: '',
		description: 'ID of the employee file',
	},
];
