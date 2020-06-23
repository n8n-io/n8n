import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SIGNL4Api implements ICredentialType {
	name = 'SIGNL4Api';
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
