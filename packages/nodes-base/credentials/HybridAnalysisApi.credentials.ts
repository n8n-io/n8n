import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class HybridAnalysisApi implements ICredentialType {
	name = 'hybridAnalysisApi';

	displayName = 'Hybrid Analysis API';

	icon = 'file:icons/Hybrid.png';

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
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
