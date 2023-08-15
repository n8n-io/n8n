import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FoxyJwtApi implements ICredentialType {
	name = 'foxyJwtApi';
	displayName = 'Foxy API Credentials';
	properties: INodeProperties[] = [
		{
			displayName: 'Client Id',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
			description: 'Consumer Client Id',
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			default: '',
			required: true,
			description: 'Consumer Client Secret',
		},
		{
			displayName: 'Refresh Token',
			name: 'refreshToken',
			type: 'string',
			default: '',
			required: true,
			description: 'Consumer Refresh Token',
		},
	];
}
