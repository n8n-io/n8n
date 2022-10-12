import { INodeProperties } from 'n8n-workflow';

// for companies, leads, persons
export const addressFixedCollection: INodeProperties = {
	displayName: 'Address',
	name: 'address',
	placeholder: 'Add Address Fields',
	type: 'fixedCollection',
	default: {},
	options: [
		{
			displayName: 'Address Fields',
			name: 'addressFields',
			values: [
				{
					displayName: 'Street',
					name: 'street',
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
				},
				{
					displayName: 'Postal Code',
					name: 'postal_code',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Country',
					name: 'country',
					type: 'string',
					default: '',
					description: 'ISO 3166 alpha-2 country code',
				},
			],
		},
	],
};

// for companies, leads, persons
export const phoneNumbersFixedCollection: INodeProperties = {
	displayName: 'Phone Numbers',
	name: 'phone_numbers',
	placeholder: 'Add Phone Number',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			displayName: 'Phone Fields',
			name: 'phoneFields',
			values: [
				{
					displayName: 'Number',
					name: 'number',
					type: 'string',
					default: '',
				},
				{
					displayName: 'Category',
					name: 'category',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

// for persons, multiple emails
export const emailsFixedCollection: INodeProperties = {
	displayName: 'Emails',
	name: 'emails',
	placeholder: 'Add Email',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: {},
	options: [
		{
			displayName: 'Email Fields',
			name: 'emailFields',
			values: [
				{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					placeholder: 'name@email.com',
					default: '',
				},
				{
					displayName: 'Category',
					name: 'category',
					type: 'string',
					default: '',
				},
			],
		},
	],
};

// for leads, single email
export const emailFixedCollection: INodeProperties = {
	displayName: 'Email',
	name: 'email',
	placeholder: 'Add Email',
	type: 'fixedCollection',
	default: {},
	options: [
		{
			displayName: 'Email Fields',
			name: 'emailFields',
			values: [
				{
					displayName: 'Email',
					name: 'email',
					type: 'string',
					placeholder: 'name@email.com',
					default: '',
				},
				{
					displayName: 'Category',
					name: 'category',
					type: 'string',
					default: '',
				},
			],
		},
	],
};
