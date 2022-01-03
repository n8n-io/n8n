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
		displayName: 'Input Data Field Name',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
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
		required: true,
		description: 'The name of the input field containing the binary file data to be uploaded. Supported file types: PNG, JPEG',
	},
	// {
	// 	displayName: 'File Name',
	// 	name: 'fileName',
	// 	type: 'string',
	// 	required: true,
	// 	displayOptions: {
	// 		show: {
	// 			operation: [
	// 				'upload',
	// 			],
	// 			resource: [
	// 				'employeeFile',
	// 			],
	// 		},
	// 	},
	// 	default: '',
	// },
	{
		displayName: 'Category ID',
		name: 'categoryId',
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
