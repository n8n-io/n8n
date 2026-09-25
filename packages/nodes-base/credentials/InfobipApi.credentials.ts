import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class InfobipApi implements ICredentialType {
	name = 'infobipApi';

	displayName = 'Infobip API';

	documentationUrl = 'infobip';

	icon = 'file:icons/Infobip.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://xxxxx.api.infobip.com',
			description:
				'The API base URL of your account. Find it on the homepage of the <a href="https://portal.infobip.com/" target="_blank">Infobip portal</a>.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
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
				Authorization: '=App {{ $credentials.apiKey }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{ $credentials.baseUrl.replace(new RegExp("/$"), "") }}',
			url: '/account/1/balance',
		},
	};
}
