import {
	INodeProperties,
} from 'n8n-workflow';

export const contactOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a contact',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Get all contacts',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 contact:list                             */
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
					'contact',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				displayName: 'Limit for list (100 contacts by default)',
				name: 'limit',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Select page number (0 by default)',
				name: 'page',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Create method',
		name: 'createOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				name: 'Fields',
				value: 'fields',
				description: 'Create a contact with fields',
			},
			{
				name: 'JSON',
				value: 'jsonField',
				description: 'Create a contact with JSON',
			},
		],
		default: 'jsonField',
		//description: 'The operation to perform.',
	},
	
	
	
	{
		displayName: 'JSON',
		name: 'json',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				createOperation: [
					'jsonField',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
	

	{
		displayName: 'First name',
		name: 'firstName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				createOperation: [
					'fields',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},

	{
		displayName: 'Last name',
		name: 'lastName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				createOperation: [
					'fields',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
	
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				createOperation: [
					'fields',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
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
					'contact',
				],
				createOperation: [
					'fields',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Poste',
				name: 'poste',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
			},
		],
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Update method',
		name: 'updateOperation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				name: 'Fields',
				value: 'fields',
				description: 'Update a contact with fields',
			},
			{
				name: 'JSON',
				value: 'jsonField',
				description: 'Update a contact with JSON',
			},
		],
		default: 'jsonField',
	},
	
	{
		displayName: 'Contact ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
	
	{
		displayName: 'JSON',
		name: 'json',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				updateOperation: [
					'jsonField',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
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
					'contact',
				],
				updateOperation: [
					'fields',
				],
				operation: [
					'update',
				],
			},
		},
		options: [
			{
				displayName: 'First name',
				name: 'firstName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Last name',
				name: 'lastName',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Poste',
				name: 'poste',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Phone number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
			},
		],
	},


	/* -------------------------------------------------------------------------- */
	/*                                 contact:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'contact',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 contact:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Contact ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'contact',
				],
			},
		},
		default: '',
	},
] as INodeProperties[];
