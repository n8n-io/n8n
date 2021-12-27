import {
	EmployeesProperties,
} from '../../Interfaces';

export const employeesGetDescription: EmployeesProperties = [
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
					'employees',
				],
			},
		},
		default: '',
		description: 'Id of the employee',
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		options: [
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
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'employees',
				],
			},
		},
		default: [
			'displayName',
			'firstName',
			'lastName',
			'preferredName',
			'jobTitle',
			'workPhone',
			'mobilePhone',
			'workEmail',
			'department',
			'location',
			'division',
			'facebook',
			'linkedIn',
			'twitterFeed',
			'pronouns',
			'workPhoneExtension',
			'supervisor',
			'photoUrl',
		],
		description: 'Set of fields to get from employee data, separated by coma',
	},
];
