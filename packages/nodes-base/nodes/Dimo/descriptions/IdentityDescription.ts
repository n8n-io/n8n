import { INodeProperties } from 'n8n-workflow';

export const identityOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['identity'],
		},
	},
	options: [
		{
			name: 'Custom Identity Query',
			value: 'customIdentity',
			action: 'Custom identity query',
		},
		{
			name: 'Count DIMO Vehicles',
			value: 'countDimoVehicles',
			action: 'Count dimo vehicles',
		},
	],
	default: 'customIdentity',
};

export const identityProperties: INodeProperties[] = [
	{
		displayName: 'Custom Identity Query',
		name: 'customIdentityQuery',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['customIdentity'],
			},
		},
		default: '',
		description: 'Your custom GraphQL query for Identity',
		required: true,
	},
	{
		displayName: `Variables`,
		name: 'variables',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['customIdentity'],
			},
		},
		default: '{}',
		description: 'Variables for your custom Identity query',
	},
];

export const identityDescription = {
	operations: identityOperations,
	properties: identityProperties,
};
