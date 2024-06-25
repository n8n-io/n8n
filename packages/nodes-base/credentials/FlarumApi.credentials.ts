import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FlarumApi implements ICredentialType {
	name = 'flarumApi';

	displayName = 'Flarum API';

	documentationUrl = 'flarum';

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com/flarum',
			required: true,
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];
}