import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TaigaCloudApi implements ICredentialType {
	name = 'taigaCloudApi';
	displayName = 'Taiga Cloud API';
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
	];
}
