import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class SekoiaApi implements ICredentialType {
	name = 'sekoiaApi';

	displayName = 'Sekoia API';

	icon: Icon = 'file:icons/Sekoia.svg';

	documentationUrl = 'sekoia';

	httpRequestNode = {
		name: 'Sekoia',
		docsUrl: 'https://docs.sekoia.io/cti/features/integrations/api/',
		apiBaseUrl: 'https://api.sekoia.io/',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
