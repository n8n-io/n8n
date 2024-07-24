import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SysdigApi implements ICredentialType {
	name = 'sysdigApi';

	displayName = 'Sysdig API';

	documentationUrl = 'sysdig';

	icon = { light: 'file:icons/Sysdig.png', dark: 'file:icons/Sysdig.png' } as const;

	httpRequestNode = {
		name: 'Sysdig',
		docsUrl: 'https://docs.sysdig.com/en/docs/developer-tools/sysdig-api/',
		apiBaseUrl: 'https://api.us2.sysdig.com/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};
}
