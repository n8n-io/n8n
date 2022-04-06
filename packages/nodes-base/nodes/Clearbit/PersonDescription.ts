import { INodeProperties } from 'n8n-workflow';

export const personOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'person',
				],
			},
		},
		options: [
			{
				name: 'Enrich',
				value: 'enrich',
				description: 'Look up a person and company data based on an email or domain',
			},
		],
		default: 'enrich',
		description: 'The operation to perform.',
	},
];

export const personFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 person:enrich                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'enrich',
				],
			},
		},
		description: 'The email address to look up.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'person',
				],
				operation: [
					'enrich',
				],
			},
		},
		options: [
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'The name of the person’s employer.',
			},
			{
				displayName: 'Company Domain',
				name: 'companyDomain',
				type: 'string',
				default: '',
				description: 'The domain for the person’s employer.',
			},
			{
				displayName: 'Facebook',
				name: 'facebook',
				type: 'string',
				default: '',
				description: 'The Facebook URL for the person.',
			},
			{
				displayName: 'Family Name',
				name: 'familyName',
				type: 'string',
				default: '',
				description: 'Last name of person. If you have this, passing this is strongly recommended to improve match rates.',
			},
			{
				displayName: 'Given Name',
				name: 'givenName',
				type: 'string',
				default: '',
				description: 'First name of person.',
			},
			{
				displayName: 'IP Address',
				name: 'ipAddress',
				type: 'string',
				default: '',
				description: 'IP address of the person. If you have this, passing this is strongly recommended to improve match rates.',
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				description: 'The city or country where the person resides.',
			},
			{
				displayName: 'LinkedIn',
				name: 'linkedIn',
				type: 'string',
				default: '',
				description: 'The LinkedIn URL for the person.',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
				description: 'The Twitter handle for the person.',
			},
		],
	},
];
