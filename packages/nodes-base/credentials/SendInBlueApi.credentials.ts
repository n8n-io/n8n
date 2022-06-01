import {
	IAuthenticateHeaderAuth,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SendinblueApi implements ICredentialType {
	name = 'sendinblueApi';
	displayName = 'Sendinblue API';
	documentationUrl = 'sendinblue';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string',
			default: '',
		},
	];
	authenticate = {
		type: 'headerAuth',
		properties: {
			name: 'api-key',
			value: '={{$credentials.accessToken}}',
		},
	} as IAuthenticateHeaderAuth;
}
