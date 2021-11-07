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
					'vendor',
					'customer'
				],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all contact',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create contact',
			},
		],
		default: 'getAll',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [

	/* -------------------------------------------------------------------------- */
	/*                                contact:create                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Name',
		name: 'contact_name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'vendor',
					'customer'
				],
				operation: [
					'create'
				],
			},
		},
	},
] as INodeProperties[];
