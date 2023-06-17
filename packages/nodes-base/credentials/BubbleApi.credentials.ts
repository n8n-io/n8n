import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BubbleApi implements ICredentialType {
	name = 'bubbleApi';

	displayName = 'Bubble API';

	documentationUrl = 'bubble';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'App Name',
			name: 'appName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'live',
			options: [
				{
					name: 'Development',
					value: 'development',
				},
				{
					name: 'Live',
					value: 'live',
				},
			],
		},
		{
			displayName: 'Hosting',
			name: 'hosting',
			type: 'options',
			default: 'bubbleHosted',
			options: [
				{
					name: 'Bubble-Hosted',
					value: 'bubbleHosted',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			placeholder: 'mydomain.com',
			default: '',
			displayOptions: {
				show: {
					hosting: ['selfHosted'],
				},
			},
		},
	];
}
