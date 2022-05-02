import {
	IAuthenticateBearer,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AsanaApi implements ICredentialType {
	name = 'asanaApi';
	displayName = 'Asana API';
	documentationUrl = 'asana';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];

	authenticate = {
		type: 'bearer',
		properties: {},
	} as IAuthenticateBearer;

}
