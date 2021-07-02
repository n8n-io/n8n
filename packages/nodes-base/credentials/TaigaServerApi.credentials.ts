import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TaigaServerApi implements ICredentialType {
	name = 'taigaServerApi';
	displayName = 'Taiga Server API';
	documentationUrl = 'taiga';
	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://taiga.yourdomain.com',
		},
	];
}
