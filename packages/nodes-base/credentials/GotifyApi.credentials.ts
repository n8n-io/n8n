import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class GotifyApi implements ICredentialType {
	name = 'gotifyApi';

	displayName = 'Gotify API';

	documentationUrl = 'gotify';

	properties: INodeProperties[] = [
		{
			displayName: 'App API Token',
			name: 'appApiToken',
			type: 'string',
			default: '',
			description: '(Optional) Needed for message creation',
		},
		{
			displayName: 'Client API Token',
			name: 'clientApiToken',
			type: 'string',
			default: '',
			description: '(Optional) Needed for everything (delete, getAll) but message creation',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			description: 'The URL of the Gotify host',
		},
	];
}
