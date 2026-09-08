import type { INodeProperties } from 'n8n-workflow';

export const createEmployeeSharedDescription = (sync = false): INodeProperties[] => {
	let elements: INodeProperties[] = [
		{
			displayName: 'Address',
			name: 'address',
			placeholder: 'Address',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: false,
			},
			default: {},
			options: [
				{
					name: 'value',
					displayName: 'Address',
					values: [
						{
							displayName: 'Line 1',
							name: 'address1',
							type: 'string',
							default: '',
						},
						{
							displayName: 'Line 2',
							name: 'address2',
							type: 'string',
							default: '',
						},
						{
							displayName: 'City',
							name: 'city',
							type: 'string',
							default: '',
						},
						{
							displayName: 'State',
							name: 'state',
							type: 'string',
							default: '',
							placeholder: 'Florida',
							description: 'The full name of the state/province',
						},
						{
							displayName: 'Country',
							name: 'country',
							type: 'string',
							default: '',
							placeholder: 'United States',
							description: 'The name of the country. Must exist in the BambooHr country list.',
						},
					],
				},
			],
		},
		{
			displayName: 'Date of birth',
			name: 'dateOfBirth',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Department name or ID',
			name: 'department',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getDepartments',
			},
			default: '',
		},
		{
			displayName: 'Division name or ID',
			name: 'division',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getDivisions',
			},
			default: '',
		},
		{
			displayName: 'Employee number',
			name: 'employeeNumber',
			type: 'string',
			default: '',
		},
		{
			displayName: 'FLSA overtime status',
			name: 'exempt',
			type: 'options',
			options: [
				{
					name: 'Exempt',
					value: 'exempt',
				},
				{
					name: 'Non-exempt',
					value: 'non-exempt',
				},
			],
			default: '',
		},
		{
			displayName: 'Gender',
			name: 'gender',
			type: 'options',
			options: [
				{
					name: 'Female',
					value: 'female',
				},
				{
					name: 'Male',
					value: 'male',
				},
			],
			default: '',
		},
		{
			displayName: 'Hire date',
			name: 'hireDate',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Location name or ID',
			name: 'location',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getEmployeeLocations',
			},
			default: '',
		},
		{
			displayName: 'Marital status',
			name: 'maritalStatus',
			type: 'options',
			options: [
				{
					name: 'Single',
					value: 'single',
				},
				{
					name: 'Married',
					value: 'married',
				},
				{
					name: 'Domestic partnership',
					value: 'domesticPartnership',
				},
			],
			default: '',
		},
		{
			displayName: 'Mobile phone',
			name: 'mobilePhone',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Pay per',
			name: 'paidPer',
			type: 'options',

			// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
			options: [
				{
					name: 'Hour',
					value: 'hour',
				},
				{
					name: 'Day',
					value: 'day',
				},
				{
					name: 'Week',
					value: 'week',
				},
				{
					name: 'Month',
					value: 'month',
				},
				{
					name: 'Quater',
					value: 'quater',
				},
				{
					name: 'Year',
					value: 'year',
				},
			],
			default: '',
		},
		{
			displayName: 'Pay rate',
			name: 'payRate',
			placeholder: 'Add pay rate',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: false,
			},
			default: {},
			options: [
				{
					name: 'value',
					displayName: 'Pay rate',
					values: [
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							placeholder: '20.00',
						},
						{
							displayName: 'Currency',
							name: 'currency',
							type: 'string',
							default: '',
							placeholder: 'USD',
						},
					],
				},
			],
		},
		{
			displayName: 'Pay type',
			name: 'payType',
			type: 'options',
			options: [
				{
					name: 'Commission',
					value: 'commission',
				},
				{
					name: 'Contract',
					value: 'contract',
				},
				{
					name: 'Daily',
					value: 'daily',
				},
				{
					name: 'Exception hourly',
					value: 'exceptionHourly',
				},
				{
					name: 'Hourly',
					value: 'hourly',
				},
				{
					name: 'Monthly',
					value: 'monthly',
				},
				{
					name: 'Piece rate',
					value: 'pieceRate',
				},
				{
					name: 'Pro rata',
					value: 'proRata',
				},
				{
					name: 'Salary',
					value: 'salary',
				},
				{
					name: 'Weekly',
					value: 'weekly',
				},
			],
			default: '',
		},
		{
			displayName: 'Preferred name',
			name: 'preferredName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Social security number',
			name: 'ssn',
			type: 'string',
			default: '',
			placeholder: '123-45-6789',
			description: 'A standard United States Social Security number, with dashes',
		},
	];

	if (sync) {
		elements = elements.map((element) => {
			return Object.assign(element, {
				displayOptions: {
					show: {
						resource: ['employee'],
						operation: ['create'],
						synced: [true],
					},
				},
				required: true,
			});
		});
		return elements;
	} else {
		elements = elements.map((element) => {
			return Object.assign(element, {
				displayOptions: {
					show: {
						'/synced': [false],
					},
				},
			});
		});
	}
	return elements;
};
