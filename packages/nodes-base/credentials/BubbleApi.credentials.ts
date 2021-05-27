import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class BubbleApi implements ICredentialType {
	name = 'bubbleApi';
	displayName = 'Bubble API';
	documentationUrl = 'bubble';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'App Name',
			name: 'appName',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options' as NodePropertyTypes,
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
			type: 'options' as NodePropertyTypes,
			default: 'bubbleHosted',
			options: [
				{
					name: 'Bubble-hosted',
					value: 'bubbleHosted',
				},
				{
					name: 'Self-hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			placeholder: 'mydomain.com',
			default: '',
			displayOptions: {
				show: {
					hosting: [
						'selfHosted',
					],
				},
			},
		},
	];
}
