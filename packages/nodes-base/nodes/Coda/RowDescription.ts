import { INodeProperties } from "n8n-workflow";

export const rowOpeations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'row',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create/Upsert a row',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update row',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get row',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the rows',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const rowFields = [

/* -------------------------------------------------------------------------- */
/*                                row:create                                */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Table',
		name: 'table',
		type: 'options',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTables',
		},
		default: [],
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create'
				]
			},
		},
		description: 'The title of the task.',
	},
	{
		displayName: 'Additional Fields',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'row',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Key Columns',
				name: 'keyColumns',
				type: 'string',
				default: '',
				description: `Optional column IDs, URLs, or names (fragile and discouraged),
				specifying columns to be used as upsert keys. If more than one separate by ,`,
			},
		]
	},
] as INodeProperties[];
