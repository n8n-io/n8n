import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class CustomerIoApi implements ICredentialType {
	name = 'customerIoApi';
	displayName = 'Customer.io API';
	documentationUrl = 'customerIo';
	properties: INodeProperties[] = [
		{
			displayName: 'Tracking API Key',
			name: 'trackingApiKey',
			type: 'string',
			default: '',
			description: 'Required for tracking API',
			required: true,
		},
		{
			displayName: 'Tracking API endpoint',
			name: 'trackingEndpoint',
			type: 'options',
			options: [
				{
					name: 'EU region',
					value: 'track-eu.customer.io',
				},
				{
					name: 'Global region',
					value: 'track.customer.io',
				},
			],
			default: 'track.customer.io',
			description: 'Should be set based on your account region',
			required: true,
		},
		{
			displayName: 'Tracking Site ID',
			name: 'trackingSiteId',
			type: 'string',
			default: '',
			description: 'Required for tracking API',
		},
		{
			displayName: 'App API Key',
			name: 'appApiKey',
			type: 'string',
			default: '',
			description: 'Required for App API',
		},
	];
}
