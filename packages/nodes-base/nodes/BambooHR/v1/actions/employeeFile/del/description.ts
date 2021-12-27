import {
	EmployeeFileProperties,
} from '../../Interfaces';

export const employeeFileDelDescription: EmployeeFileProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'del',
				],
				resource: [
					'employeeFile',
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
					'del',
				],
				resource: [
					'employeeFile',
				],
			},
		},
		default: '',
		description: 'ID of the employee file',
	},
];
