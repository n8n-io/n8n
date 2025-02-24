import { INodeProperties } from 'n8n-workflow';

export const authenticationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['authentication'],
		},
	},
	options: [
		{
			name: 'Get Vehicle JWT',
			value: 'getVehicleJwt',
			action: 'Get vehicle jwt',
		},
	],
	default: 'getVehicleJwt',
};

export const authenticationProperties: INodeProperties[] = [
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['authentication'],
				operation: ['getVehicleJwt'],
			},
		},
		default: 0,
		description: 'The token ID of the vehicle',
		required: true,
	},
];

export const authenticationDescription = {
	operations: authenticationOperations,
	properties: authenticationProperties,
};
