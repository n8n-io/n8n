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

	// Credential `test` requests are declarative expressions and cannot call the
	// node's `getJotFormBaseUrl`, so this mirrors its normalization: strip the
	// protocol, collapse repeated slashes, and drop a trailing slash. Keep it in
	// step with `getJotFormBaseUrl` in the node.
	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{ "https://" + ($credentials.apiDomain === "custom" ? $credentials.customApiDomain : $credentials.apiDomain).replace(new RegExp("^https?://", "i"), "").replace(new RegExp("/{2,}", "g"), "/").replace(new RegExp("/+$"), "") }}',
			url: '/user',
			method: 'GET',
			headers: {
				APIKEY: '={{ $credentials.apiKey }}',
			},
		},
	};
}
