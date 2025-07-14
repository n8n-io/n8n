import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class MessageBirdApi implements ICredentialType {
	name = 'messageBirdApi';

	displayName = 'MessageBird API';

	documentationUrl = 'messageBird';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'accessKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
