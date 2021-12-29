import {
	EmployeeFileProperties,
} from '../../Interfaces';

export const employeeFileGetAllDescription: EmployeeFileProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'employeeFile',
				],
			},
		},
		default: '',
		description: 'ID of the employee. Set to <code>0</code> to retrieve the fields of the logged-in user.',
	},
	{
		displayName: 'Only Files',
		name: 'onlyFiles',
		type: 'boolean',
		default: true,
		description: 'Whether to return all the files without the categories.',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'employeeFile',
				],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results.',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'employeeFile',
				],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 5,
		description: 'The number of results to return.',
		typeOptions: {
			minValue: 1,
			maxValue: 1000,
		},
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'employeeFile',
				],
				returnAll: [
					false,
				],
			},
		},
	},
];
