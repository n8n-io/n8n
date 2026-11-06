import type {
	IAuthenticate,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenWeatherMapApi implements ICredentialType {
	name = 'openWeatherMapApi';

	displayName = 'OpenWeatherMap API';

	documentationUrl = 'openweathermap';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'url',
			type: 'hidden',
			default: 'https://api.openweathermap.org',
		},
	];

	authenticate: IAuthenticate = {
		type: 'generic',
		properties: {
			qs: {
				appid: '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.url}}',
			url: '/data/2.5/weather',
			qs: {
				q: 'London',
			},
		},
	};
}
