import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

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

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				api_token: '={{$credentials.apiToken}}',
			},
		},
	};
}
