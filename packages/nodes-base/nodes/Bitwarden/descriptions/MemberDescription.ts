import {
	INodeProperties,
} from 'n8n-workflow';

export const memberOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Delete',
				value: 'delete',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Get Members',
				value: 'getMembers',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'member',
				],
			},
		},
	},
] as INodeProperties[];

export const memberFields = [
	// ----------------------------------
	//       member: shared
	// ----------------------------------
	{
		displayName: 'Member ID',
		name: 'memberId',
		type: 'string',
		required: true,
		description: 'The identifier of the member.',
		default: '',
		placeholder: '5e59c8c7-e05a-4d17-8e85-acc301343926',
		displayOptions: {
			show: {
				resource: [
					'member',
				],
				operation: [
					'delete',
					'get',
					'update',
				],
			},
		},
	},
] as INodeProperties[];
