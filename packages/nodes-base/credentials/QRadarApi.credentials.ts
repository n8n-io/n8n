import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class QRadarApi implements ICredentialType {
	name = 'qRadarApi';

	displayName = 'QRadar API';

	icon = 'file:icons/IBM.svg';

	documentationUrl = 'qradar';

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
				SEC: '={{$credentials.apiKey}}',
			},
		},
	};
}
