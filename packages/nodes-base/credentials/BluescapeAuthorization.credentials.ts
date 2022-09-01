import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BluescapeAuthorization implements ICredentialType {
	name = 'bluescapeAuthorization';
	displayName = 'Bluescape Credentials for Access Token';
	documentationUrl = 'bluescape';
	properties: INodeProperties[] = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: 'my.bluescape.io',
			placeholder: 'n8n',
			description: 'The Bluescape domain.',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
		},
	];
}
