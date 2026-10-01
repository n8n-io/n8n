import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class LinearApi implements ICredentialType {
	name = 'linearApi';

	displayName = 'Linear API';

	documentationUrl = 'linear';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Signing Secret',
			name: 'signingSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'The signing secret is used to verify the authenticity of webhook requests sent by Linear.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{$credentials.apiKey}}',
			},
		},
	};
}
