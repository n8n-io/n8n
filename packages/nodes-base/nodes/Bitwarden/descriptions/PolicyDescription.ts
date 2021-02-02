import {
	INodeProperties,
} from 'n8n-workflow';

export const policyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Get All',
				value: 'getAll',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'policy',
				],
			},
		},
	},
] as INodeProperties[];

export const policyFields = [
	// ----------------------------------
	//       policy: shared
	// ----------------------------------
	{
		displayName: 'Policy ID',
		name: 'policyId',
		type: 'string',
		required: true,
		description: 'The identifier of the policy.',
		default: '',
		placeholder: '5e59c8c7-e05a-4d17-8e85-acc301343926',
		displayOptions: {
			show: {
				resource: [
					'policy',
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
