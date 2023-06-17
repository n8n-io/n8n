import type { EmployeeProperties } from '../../Interfaces';
import { updateEmployeeSharedDescription } from './sharedDescription';

export const employeeUpdateDescription: EmployeeProperties = [
	{
		displayName: 'Employee ID',
		name: 'employeeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['employee'],
			},
		},
		default: '',
	},
	{
		displayName: 'Synced with Trax Payroll',
		name: 'synced',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['employee'],
			},
		},
		default: false,
		description:
			'Whether the employee to create was added to a pay schedule synced with Trax Payroll',
	},
	...updateEmployeeSharedDescription(true),
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: ['update'],
				resource: ['employee'],
			},
		},
		options: [
			...updateEmployeeSharedDescription(false),
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
