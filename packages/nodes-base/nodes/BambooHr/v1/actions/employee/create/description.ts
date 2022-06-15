import {
	EmployeeProperties,
} from '../../Interfaces';

import {
	createEmployeeSharedDescription,
} from './shareDescription';

export const employeeCreateDescription: EmployeeProperties = [
	{
		displayName: 'Synced with Trax Payroll',
		name: 'synced',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'employee',
				],
			},
		},
		default: false,
		description: 'Whether the employee to create was added to a pay schedule synced with Trax Payroll',
	},
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'employee',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'employee',
				],
			},
		},
		default: '',
	},
	...createEmployeeSharedDescription(true),
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'employee',
				],
			},
		},
		options: [
			...createEmployeeSharedDescription(false),
			{
				displayName: 'Work Email',
				name: 'workEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Work Phone',
				name: 'workPhone',
				type: 'string',
				default: '',
			},
		],
	},
];