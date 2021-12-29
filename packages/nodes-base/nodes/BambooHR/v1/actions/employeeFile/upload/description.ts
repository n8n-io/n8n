import {
	EmployeeFileProperties,
} from '../../Interfaces';

export const employeeFileUploadDescription: EmployeeFileProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
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
		displayName: 'File Content',
		name: 'file',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'employeeFile',
				],
			},
		},
		placeholder: '',
		description: 'The text content of the file to upload.',
	},
	{
		displayName: 'File name',
		name: 'fileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'employeeFile',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Category ID',
		name: 'category',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'employeeFile',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Share with employee',
		name: 'share',
		type: 'boolean',
		default: true,
		description: 'Whether this file is shared or not',
		displayOptions: {
			show: {
				operation: [
					'upload',
				],
				resource: [
					'employeeFile',
				],
			},
		},
	},
];
