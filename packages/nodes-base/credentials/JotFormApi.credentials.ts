import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class JotFormApi implements ICredentialType {
	name = 'jotFormApi';

	displayName = 'JotForm API';

	documentationUrl = 'jotform';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Domain',
			name: 'apiDomain',
			type: 'options',
			options: [
				{
					name: 'api.jotform.com',
					value: 'api.jotform.com',
				},
				{
					name: 'eu-api.jotform.com',
					value: 'eu-api.jotform.com',
				},
				{
					name: 'hipaa-api.jotform.com',
					value: 'hipaa-api.jotform.com',
				},
				{
					name: 'Custom (Enterprise)',
					value: 'custom',
				},
			],
			default: 'api.jotform.com',
			description:
				'The API domain to use. Use "eu-api.jotform.com" if your account is based in Europe. Choose "Custom" for JotForm Enterprise.',
		},
		{
			displayName: 'Custom API Domain',
			name: 'customApiDomain',
			type: 'string',
			default: '',
			placeholder: 'your-subdomain.jotform.com/API',
			displayOptions: {
				show: {
					apiDomain: ['custom'],
				},
			},
			description:
				'Your JotForm Enterprise API base URL, for example "your-subdomain.jotform.com/API". Do not include the protocol.',
		},
	];

	// Declarative credential tests cannot call `getJotFormBaseUrl`, so this mirrors
	// its validation. An invalid domain returns an empty base URL, so the request
	// fails instead of sending the API key to an unintended host.
	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ (() => { const raw = String(($credentials.apiDomain === "custom" ? $credentials.customApiDomain : $credentials.apiDomain) || "").trim(); const scheme = new RegExp("^([a-z][a-z0-9+.-]*)://", "i").exec(raw); const domain = raw.replace(new RegExp("^https?://", "i"), "").replace(new RegExp("/{2,}", "g"), "/").replace(new RegExp("/+$"), ""); if ((scheme && !new RegExp("^https?$", "i").test(scheme[1])) || !domain || new RegExp("[@?#]").test(domain)) return ""; return "https://" + domain; })() }}',
			url: '/user',
			method: 'GET',
			headers: {
				APIKEY: '={{ $credentials.apiKey }}',
			},
		},
	};
}
