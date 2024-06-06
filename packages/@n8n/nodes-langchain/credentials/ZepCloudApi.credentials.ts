import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class ZepCloudApi implements ICredentialType {
	name = 'zepCloudApi';

	displayName = 'Zep Cloud Api';

	documentationUrl = 'zep-cloud';

	properties: INodeProperties[] = [
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
