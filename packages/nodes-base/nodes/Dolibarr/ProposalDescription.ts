import {
	INodeProperties,
} from 'n8n-workflow';

export const proposalOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'proposal',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a proposal',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a proposal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a proposal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a proposal',
			},
			{
				name: 'List',
				value: 'list',
				description: 'Get all proposals',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
] as INodeProperties[];

export const proposalFields = [

	/* -------------------------------------------------------------------------- */
	/*                                 proposal:list                             */
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
					'proposal',
				],
				operation: [
					'list',
				],
			},
		},
		options: [
			{
				displayName: 'Limit for list',
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
	/*                                 proposal:create                             */
	/* -------------------------------------------------------------------------- */

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
				resource: [
					'proposal',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 proposal:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Proposal ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'proposal',
				],
				operation: [
					'update',
				],
			},
		},
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
				resource: [
					'proposal',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 proposal:delete                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Proposal ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'proposal',
				],
				operation: [
					'delete',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 proposal:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Proposal ID',
		name: 'id',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'proposal',
				],
			},
		},
		default: '',
	},
] as INodeProperties[];
