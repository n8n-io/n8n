import { INodeProperties } from 'n8n-workflow';

export const telemetryOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			resource: ['telemetry'],
		},
	},
	options: [
		{
			name: 'Custom Telemetry Query',
			value: 'customTelemetry',
			action: 'Custom telemetry query',
		},
		{
			name: 'Get Vehicle VIN',
			value: 'getVehicleVin',
			action: 'Get vehicle vin',
		},
	],
	default: 'customTelemetry',
};

export const telemetryProperties: INodeProperties[] = [
	{
		displayName: 'Token ID',
		name: 'tokenId',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['telemetry'],
			},
		},
		default: 0,
		description: 'The Token ID of the vehicle you are creating a VIN Verifiable Credential for',
		required: true,
	},
	{
		displayName: `Custom Telemetry Query`,
		name: 'customTelemetryQuery',
		type: 'string',
		typeOptions: {
			alwaysOpenEditWindow: true,
		},
		displayOptions: {
			show: {
				resource: ['telemetry'],
				operation: ['customTelemetry'],
			},
		},
		default: '',
		description: 'Your custom GraphQL query for Telemetry',
		required: true,
	},
	{
		displayName: `Variables`,
		name: 'variables',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['telemetry'],
				operation: ['customTelemetry'],
			},
		},
		default: '{}',
		description: 'Variables for your custom Telemetry query',
	},
];

export const telemetryDescription = {
	operations: telemetryOperations,
	properties: telemetryProperties,
};
