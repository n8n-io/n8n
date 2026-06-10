import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OdooApiKeyApi implements ICredentialType {
	name = 'odooApiKeyApi';

	displayName = 'Odoo API (API Key)';

	documentationUrl = 'odoo';

	properties: INodeProperties[] = [
		{
			displayName:
				'Requires Odoo 19+ and a Custom pricing plan (not available on One App Free or Standard). Uses the /json/2 External JSON-2 API. <a href="https://www.odoo.com/documentation/19.0/developer/reference/external_api.html" target="_blank">Learn more</a>',
			name: 'apiNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Site URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://my-organization.odoo.com',
			required: true,
		},
		{
			displayName: 'Database Name',
			name: 'db',
			type: 'string',
			default: '',
			description:
				'Leave blank to auto-detect from the Site URL (e.g. my-organization). Required for self-hosted instances with multiple databases.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
			description:
				'Generate an API key in Odoo at Settings &gt; Technical &gt; API Keys. Requires Odoo 19+.',
		},
	];

	// Odoo 19+ JSON-2 API uses lowercase "bearer"
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url.replace(/\\/$/, "")}}',
			url: '/json/2/res.partner/search_read',
			method: 'POST',
			headers: {
				'X-Odoo-Database':
					'={{$credentials.db || $credentials.url.replace(/\\/$/, "").split(".")[0].split("//")[1]}}',
			},
			body: {
				domain: [],
				fields: ['id'],
				limit: 1,
			},
		},
	};
}
