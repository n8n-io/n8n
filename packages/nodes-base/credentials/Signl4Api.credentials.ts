import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Signl4Api implements ICredentialType {
	name = 'signl4Api';

	displayName = 'SIGNL4 Webhook';

	documentationUrl = 'signl4';

	properties: INodeProperties[] = [
		{
			displayName: 'Team Secret',
			name: 'teamSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'The team secret is the last part of your SIGNL4 webhook URL',
		},
	];
}
