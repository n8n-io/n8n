import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class FortiGateApi implements ICredentialType {
	name = 'fortiGateApi';

	displayName = 'Fortinet FortiGate API';

	documentationUrl = 'fortigate';

	icon: Icon = 'file:icons/Fortinet.svg';

	httpRequestNode = {
		name: 'Fortinet FortiGate',
		docsUrl:
			'https://docs.fortinet.com/document/fortigate/7.4.1/administration-guide/940602/using-apis',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				access_token: '={{$credentials.accessToken}}',
			},
		},
	};
}
