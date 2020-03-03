import { INodeProperties } from "n8n-workflow";

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
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const contactFields = [

/* -------------------------------------------------------------------------- */
/*                               contact:get                                  */
/* -------------------------------------------------------------------------- */
{
	displayName: 'Contact ID',
	name: 'contactId',
	type: 'string',
	required: true,
	displayOptions: {
		show: {
			resource: [
				'contact',
			],
			operation: [
				'get',
			],
		},
	},
	default: '',
	description: 'Unique identifier for a particular contact',
}
] as INodeProperties[];
