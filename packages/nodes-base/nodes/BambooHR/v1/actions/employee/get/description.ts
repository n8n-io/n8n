import {
	EmployeeProperties,
} from '../../Interfaces';

export const employeeGetDescription: EmployeeProperties = [
	{
		displayName: 'Employee ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'employee',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'employee',
				],
			},
		},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'multiOptions',
				options: [
					{
						name: '[All]',
						value: 'all',
					},
					{
						name: 'Display Name',
						value: 'displayName',
					},
					{
						name: 'First Name',
						value: 'firstName',
					},
					{
						name: 'Last Name',
						value: 'lastName',
					},
					{
						name: 'Preferred Name',
						value: 'preferredName',
					},
					{
						name: 'Job Title',
						value: 'jobTitle',
					},
					{
						name: 'Work Phone',
						value: 'workPhone',
					},
					{
						name: 'Mobile Phone',
						value: 'mobilePhone',
					},
					{
						name: 'Work Email',
						value: 'workEmail',
					},
					{
						name: 'Department',
						value: 'department',
					},
					{
						name: 'Location',
						value: 'location',
					},
					{
						name: 'Division',
						value: 'division',
					},
					{
						name: 'Facebook',
						value: 'facebook',
					},
					{
						name: 'LinkedIn',
						value: 'linkedIn',
					},
					{
						name: 'Twitter Feed',
						value: 'twitterFeed',
					},
					{
						name: 'Pronouns',
						value: 'pronouns',
					},
					{
						name: 'Work Phone Extension',
						value: 'workPhoneExtension',
					},
					{
						name: 'Supervisor',
						value: 'supervisor',
					},
					{
						name: 'Photo Url',
						value: 'photoUrl',
					},
				],
				default: [
					'all',
				],
				description: 'Set of fields to get from employee data, separated by comma',
			},
		],
	},
];
