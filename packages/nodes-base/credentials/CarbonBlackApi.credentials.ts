import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CarbonBlackApi implements ICredentialType {
	name = 'carbonBlackApi';

	displayName = 'Carbon Black API';

	icon = { light: 'file:icons/vmware.svg', dark: 'file:icons/vmware.dark.svg' } as const;

	documentationUrl = 'carbonblack';

	httpRequestNode = {
		name: 'Carbon Black',
		docsUrl: 'https://developer.carbonblack.com/reference',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'URL',
			name: 'apiUrl',
			type: 'string',
			placeholder: 'https://defense.conferdeploy.net/',
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
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
				'X-Auth-Token': '={{$credentials.accessToken}}',
			},
		},
	};

	// test: ICredentialTestRequest = {
	// 	request: {
	// 		baseURL: '={{$credentials.apiUrl}}',
	// 		url: 'integrationServices/v3/auditlogs',
	// 	},
	// };
}
