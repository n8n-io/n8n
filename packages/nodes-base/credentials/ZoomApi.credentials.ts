import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZoomApi implements ICredentialType {
	name = 'zoomApi';

	displayName = 'Zoom API';

	documentationUrl = 'zoom';

	properties: INodeProperties[] = [
		{
			displayName:
				'On 1 June, 2023 Zoom will remove JWT App support. You will have to connect to Zoom using the Oauth2 auth method. <a target="_blank" href="https://marketplace.zoom.us/docs/guides/build/jwt-app/jwt-faq/">More details (zoom.us)</a>',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'JWT Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.zoom.us/v2',
			url: '/users/me',
		},
	};
}
