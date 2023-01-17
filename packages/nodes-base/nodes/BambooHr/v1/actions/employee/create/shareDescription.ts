import { INodeProperties } from 'n8n-workflow';

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
			displayName: 'Date of Birth',
			name: 'dateOfBirth',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Department Name or ID',
			name: 'department',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getDepartments',
			},
			default: '',
		},
		{
			displayName: 'Division Name or ID',
			name: 'division',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getDivisions',
			},
			default: '',
		},
		{
			displayName: 'Employee Number',
			name: 'employeeNumber',
			type: 'string',
			default: '',
		},
		{
			displayName: 'FLSA Overtime Status',
			name: 'exempt',
			type: 'options',
			options: [
				{
					name: 'Exempt',
					value: 'exempt',
				},
				{
					name: 'Non-Exempt',
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
			displayName: 'Hire Date',
			name: 'hireDate',
			type: 'dateTime',
			default: '',
		},
		{
			displayName: 'Location Name or ID',
			name: 'location',
			type: 'options',
			description:
				'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
			typeOptions: {
				loadOptionsMethod: 'getEmployeeLocations',
			},
			default: '',
		},
		{
			displayName: 'Marital Status',
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
					name: 'Domestic Partnership',
					value: 'domesticPartnership',
				},
			],
			default: '',
		},
		{
			displayName: 'Mobile Phone',
			name: 'mobilePhone',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Pay Per',
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
			displayName: 'Pay Rate',
			name: 'payRate',
			placeholder: 'Add Pay Rate',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: false,
			},
			default: {},
			options: [
				{
					name: 'value',
					displayName: 'Pay Rate',
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
			displayName: 'Pay Type',
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
					name: 'Exception Hourly',
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
					name: 'Piece Rate',
					value: 'pieceRate',
				},
				{
					name: 'Pro Rata',
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
			displayName: 'Preferred Name',
			name: 'preferredName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Social Security Number',
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
