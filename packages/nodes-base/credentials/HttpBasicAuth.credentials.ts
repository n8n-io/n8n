import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HttpBasicAuth implements ICredentialType {
	name = 'httpBasicAuth';

	displayName = 'Basic Auth';

	documentationUrl = 'httpRequest';

	genericAuth = true;

	icon = 'node:n8n-nodes-base.httpRequest';

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];
}
