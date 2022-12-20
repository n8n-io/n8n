import { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class HttpHeaderAuth implements ICredentialType {
	name = 'httpHeaderAuth';

	displayName = 'Header Auth';

	documentationUrl = 'httpRequest';

	genericAuth = true;

	icon = 'node:n8n-nodes-base.httpRequest';

	properties: INodeProperties[] = [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Value',
			name: 'value',
			type: 'string',
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'={{$credentials.name}}': '={{$credentials.value}}',
			},
		},
	};
}
