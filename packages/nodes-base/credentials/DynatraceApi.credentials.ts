import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class DynatraceApi implements ICredentialType {
	name = 'dynatraceApi';

	displayName = 'DynatraceAPI';

	documentationUrl = 'dynatrace';

	icon = { light: 'file:icons/Dynatrace.svg', dark: 'file:icons/Dynatrace.svg' } as const;

	httpRequestNode = {
		name: 'Dynatrace',
		docsUrl: 'https://docs.dynatrace.com/docs/dynatrace-api',
		apiBaseUrlPlaceholder: 'https://{your-environment-id}.live.dynatrace.com/api/v2/events',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Api-Token {{$credentials.apiKey}}',
			},
		},
	};
}
