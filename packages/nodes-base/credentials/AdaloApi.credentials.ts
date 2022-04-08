import {
	IAuthenticateBearer,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AdaloApi implements ICredentialType {
	name = 'adaloApi';
	displayName = 'Adalo API';
	documentationUrl = 'adalo';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Application ID',
			name: 'appId',
			type: 'string',
			default: '',
		},
	];

	authenticate = {
		type: 'bearer',
		properties: {
			tokenPropertyName: 'apiToken',
		},
	} as IAuthenticateBearer;
}
