import type { IAuthenticateGeneric, ICredentialType, INodeProperties } from 'n8n-workflow';

export class CarbonBlackApi implements ICredentialType {
	name = 'carbonBlackApi';

	displayName = 'Carbon Black API';

	icon = 'file:icons/vmware.svg';

	documentationUrl = 'carbonblack';

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
