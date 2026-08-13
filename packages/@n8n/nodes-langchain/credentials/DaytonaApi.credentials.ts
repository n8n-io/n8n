import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class DaytonaApi implements ICredentialType {
	name = 'daytonaApi';

	displayName = 'Daytona';

	documentationUrl = 'daytona';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];
}
