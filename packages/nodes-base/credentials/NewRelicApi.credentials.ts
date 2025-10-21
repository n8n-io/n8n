import type {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class NewRelicApi implements ICredentialType {
	name = 'newRelicApi';

	displayName = 'New Relic API';

	documentationUrl = 'newrelic';

	icon = { light: 'file:icons/NewRelic.svg', dark: 'file:icons/NewRelic.svg' } as const;

	httpRequestNode = {
		name: 'New Relic',
		docsUrl: 'https://docs.newrelic.com/docs/apis/intro-apis/introduction-new-relic-apis/',
		apiBaseUrl: 'https://log-api.newrelic.com/log/v1',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'US',
					value: 'us',
				},
				{
					name: 'EU',
					value: 'eu',
				},
			],
			default: 'us',
			description: 'The New Relic data center region',
		},
		{
			displayName: 'License Key',
			name: 'licenseKey',
			required: true,
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Your New Relic Ingest License Key',
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		requestOptions.headers = {
			...requestOptions.headers,
			'Api-Key': credentials.licenseKey,
			'Content-Type': 'application/json',
		};

		return requestOptions;
	}

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				'={{$credentials.region === "eu" ? "https://log-api.eu.newrelic.com" : "https://log-api.newrelic.com"}}',
			url: '/log/v1',
			method: 'POST',
			body: {
				message: 'n8n credential test',
				logtype: 'n8n-test',
			},
		},
	};
}
