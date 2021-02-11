import { INodeProperties } from 'n8n-workflow';

export const eventOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get an event',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all events',
			},
			{
				name: 'Register',
				value: 'register',
				description: 'Register someone to an event',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const eventFields = [

/* -------------------------------------------------------------------------- */
/*                                   event:getAll                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Automated',
						value: 'automated',
					},
					{
						name: 'Past',
						value: 'past',
					},
					{
						name: 'Upcoming',
						value: 'upcoming',
					},
				],
				default: '',
				description: '',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                   event:get                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Event ID',
		name: 'eventId',
		type: 'string',
		default: '',
		required: true,
		description: 'Event ID',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
			},
		},
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
					'event',
				],
				operation: [
					'get',
				],
			},
		},
		options: [
			{
				displayName: 'Active',
				name: 'active',
				type: 'boolean',
				default: false,
				description: 'Return only active dates in series',
			},
			{
				displayName: 'Date ID',
				name: 'date_id',
				type: 'string',
				default: '',
				description: 'Event Date ID',
			},
		],
	},

/* -------------------------------------------------------------------------- */
/*                                   event:register                           */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		required: true,
		description: 'The registrant\'s first name',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'register',
				],
			},
		},
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		required: true,
		description: 'The registrant\'s email address',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'register',
				],
			},
		},
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
					'event',
				],
				operation: [
					'register',
				],
			},
		},
		options: [
			{
				displayName: 'Custom Fields',
				name: 'custom_field',
				type: 'string',
				default: '',
				description: 'The value of the custom field. Each custom field\'s unique identifier<br /> can be found within the Event\'s Registration block in the Customize tab.',
			},
			{
				displayName: 'Event ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'Event ID',
			},
			{
				displayName: 'Event Registration URL',
				name: 'ref_url',
				type: 'string',
				default: '',
				description: 'Event Registration page URL. It can be useful when you<br /> do not know Event ID, but have Event link.',
			},
			{
				displayName: 'Event Date ID',
				name: 'date_id',
				type: 'string',
				default: '',
				description: 'Event Date ID. If not defined, system uses nearest active Date.',
			},
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				description: 'The value for the predefined Last Name field.',
			},
			{
				displayName: 'Company',
				name: 'company',
				type: 'string',
				default: '',
				description: 'The value for the predefined Company field.',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				description: 'The value for the predefined Website field.',
			},
			{
				displayName: 'Phone Number',
				name: 'phone_number',
				type: 'string',
				default: '',
				description: 'The value for the predefined Phone Number field.',
			},
			{
				displayName: 'GDPR',
				name: 'gdpr',
				type: 'string',
				default: '',
				description: 'The value for the predefined GDPR field.',
			},
		],
	},
] as INodeProperties[];
