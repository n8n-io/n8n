import {
	IAuthenticateQueryAuth,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class PipedriveApi implements ICredentialType {
	name = 'pipedriveApi';
	displayName = 'Pipedrive API';
	documentationUrl = 'pipedrive';
	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
		},
	];

	authenticate = {
		type: 'queryAuth',
		properties: {
			key: 'api_token',
			value: '={{$credentials.apiToken}}',
		},
	} as IAuthenticateQueryAuth;
}
