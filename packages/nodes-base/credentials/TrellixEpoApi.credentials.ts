import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class TrellixEpoApi implements ICredentialType {
	name = 'trellixEpoApi';

	displayName = 'Trellix (McAfee) ePolicy Orchestrator API';

	documentationUrl = 'trellixepo';

	icon: Icon = 'file:icons/Trellix.svg';

	httpRequestNode = {
		name: 'Trellix (McAfee) ePolicy Orchestrator',
		docsUrl: 'https://docs.trellix.com/en/bundle/epolicy-orchestrator-web-api-reference-guide',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};
}
