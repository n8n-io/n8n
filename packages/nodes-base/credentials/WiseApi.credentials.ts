import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class WiseApi implements ICredentialType {
	name = 'wiseApi';
	displayName = 'Wise API';
	documentationUrl = 'wise';
	properties = [
		{
			displayName: 'API Token',
			name: 'apiToken',
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
					name: 'Live',
					value: 'live',
				},
				{
					name: 'Test',
					value: 'test',
				},
			],
		},
	];
}
