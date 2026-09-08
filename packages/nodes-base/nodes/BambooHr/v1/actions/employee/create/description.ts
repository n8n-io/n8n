import { createEmployeeSharedDescription } from './shareDescription';
import type { EmployeeProperties } from '../../Interfaces';

export const employeeCreateDescription: EmployeeProperties = [
	{
		displayName: 'Synced with Trax Payroll',
		name: 'synced',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['employee'],
			},
		},
		default: false,
		description:
			'Whether the employee to create was added to a pay schedule synced with Trax Payroll',
	},
	{
		displayName: 'First name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['employee'],
			},
		},
		default: '',
	},
	{
		displayName: 'Last name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['employee'],
			},
		},
		default: '',
	},
	...(createEmployeeSharedDescription(true) as EmployeeProperties),
	{
		displayName: 'Additional fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['employee'],
			},
		},
		options: [
			...createEmployeeSharedDescription(false),
			{
				displayName: 'Work email',
				name: 'workEmail',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Work phone',
				name: 'workPhone',
				type: 'string',
				default: '',
			},
		],
	},
];
