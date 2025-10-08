import type {
	IAuthenticate,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class OpenWeatherMapApi implements ICredentialType {
	name = 'openWeatherMapApi';

	displayName = 'OpenWeatherMap API';

	documentationUrl = 'openWeatherMap';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
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
			baseURL: 'https://api.openweathermap.org/data/2.5',
			url: '/weather',
			qs: {
				q: 'London',
			},
		},
	};
}
