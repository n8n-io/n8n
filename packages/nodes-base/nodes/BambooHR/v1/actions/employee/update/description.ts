import {
	EmployeeProperties,
} from '../../Interfaces';

export const employeeUpdateDescription: EmployeeProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'employee',
				],
			},
		},
		default: '',
		description: 'ID of the employee',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'employee',
				],
			},
		},
		options: [
			{
				displayName: 'Display Name',
				name: 'displayName',
				type: 'string',
				default: '',
				description: 'Display Name',
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				description: 'First name of the employee',
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				description: 'Last name of the employee',
			},
			{
				displayName: 'Preferred Name',
				name: 'preferredName',
				type: 'string',
				default: '',
				description: 'Preferred Name',
			},
			{
				displayName: 'Work Phone',
				name: 'workPhone',
				type: 'string',
				default: '',
				description: 'Work Phone',
			},
			{
				displayName: 'Mobile Phone',
				name: 'mobilePhone',
				type: 'string',
				default: '',
				description: 'Mobile Phone',
			},
		],
	},
];
