import { INodeProperties } from 'n8n-workflow';

export const attestationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['attestation'],
		},
	},
	options: [
		{
			name: 'Create VIN VC',
			value: 'createVinVc',
			action: 'Create vin vc',
		},
		{
			name: 'Create POM VC',
			value: 'createPomVc',
			action: 'Create pom vc',
		},
	],
	default: 'createVinVc',
};

export const attestationProperties: INodeProperties[] = [
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['attestation'],
			},
		},
		default: 0,
		description: 'The Token ID of the vehicle you are creating a VIN Verifiable Credential for',
		required: true,
	},
];

export const attestationDescription = {
	operations: attestationOperations,
	properties: attestationProperties,
};
