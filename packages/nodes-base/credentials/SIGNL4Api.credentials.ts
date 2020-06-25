import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Signl4Api implements ICredentialType {
	name = 'signl4Api';
	displayName = 'SIGNL4 Webhook';
	properties = [
		{
			displayName: 'Team Secret',
			name: 'teamSecret',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'The team secret is the last part of your SIGNL4 webhook URL.'
		},
	];
}
