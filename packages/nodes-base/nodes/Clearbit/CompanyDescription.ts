import { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Autocomplete',
				value: 'autocomplete',
				description: 'Auto-complete company names and retrieve logo and domain',
			},
			{
				name: 'Enrich',
				value: 'enrich',
				description: 'Look up person and company data based on an email or domain',
			},
		],
		default: 'enrich',
		description: 'The operation to perform.',
	},
];

export const companyFields: INodeProperties[] = [

	/* -------------------------------------------------------------------------- */
	/*                                 company:enrich                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'enrich',
				],
			},
		},
		description: 'The domain to look up.',
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
					'company',
				],
				operation: [
					'enrich',
				],
			},
		},
		options: [
			{
				displayName: 'Company Name',
				name: 'companyName',
				type: 'string',
				default: '',
				description: 'The name of the company.',
			},
			{
				displayName: 'Facebook',
				name: 'facebook',
				type: 'string',
				default: '',
				description: 'The Facebook URL for the company.',
			},
			{
				displayName: 'Linkedin',
				name: 'linkedin',
				type: 'string',
				default: '',
				description: 'The LinkedIn URL for the company.',
			},
			{
				displayName: 'Twitter',
				name: 'twitter',
				type: 'string',
				default: '',
				description: 'The Twitter handle for the company.',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 company:autocomplete                       */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'autocomplete',
				],
			},
		},
		description: 'Name is the partial name of the company.',
	},
];
