import type {
	ICredentialType,
	IAuthenticateGeneric,
	ICredentialTestRequest,
	INodeProperties,
} from 'n8n-workflow';

export class KeboolaApiToken implements ICredentialType {
	name = 'keboolaApiToken';
	displayName = 'Keboola API Token';
	documentationUrl = 'https://developers.keboola.com/integrate/storage/api/';
	icon = 'file:keboola.png';

	properties: INodeProperties[] = [
		{
			displayName: 'Stack Region',
			name: 'stack',
			type: 'options',
			options: [
				{ name: 'US (Default)', value: 'https://connection.keboola.com' },
				{ name: 'EU Central (AWS)', value: 'https://connection.eu-central-1.keboola.com' },
				{ name: 'EU North (Azure)', value: 'https://connection.north-europe.azure.keboola.com' },
				{ name: 'US East (GCP)', value: 'https://connection.us-east4.gcp.keboola.com' },
			],
			default: 'https://connection.keboola.com',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			baseURL: '={{$credentials.stack}}',
			headers: {
				'X-StorageApi-Token': '={{$credentials.apiToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			url: '={{$credentials.stack}}/v2/storage/tokens',
		},
	};
}
