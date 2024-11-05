import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class HybridAnalysisApi implements ICredentialType {
	name = 'hybridAnalysisApi';

	displayName = 'Hybrid Analysis API';

	documentationUrl = 'hybridanalysis';

	icon: Icon = 'file:icons/Hybrid.png';

	httpRequestNode = {
		name: 'Hybrid Analysis',
		docsUrl: 'https://www.hybrid-analysis.com/docs/api/v2',
		apiBaseUrl: 'https://www.hybrid-analysis.com/api/',
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
				'api-key': '={{$credentials.apiKey}}',
			},
		},
	};
}
