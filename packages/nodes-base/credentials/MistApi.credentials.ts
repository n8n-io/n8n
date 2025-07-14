import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class MistApi implements ICredentialType {
	name = 'mistApi';

	displayName = 'Mist API';

	icon: Icon = 'file:icons/Mist.svg';

	documentationUrl = 'mist';

	httpRequestNode = {
		name: 'Mist',
		docsUrl: 'https://www.mist.com/documentation/mist-api-introduction/',
		apiBaseUrl: '',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Region',
			name: 'region',
			type: 'options',
			options: [
				{
					name: 'Europe',
					value: 'eu',
				},
				{
					name: 'Global',
					value: 'global',
				},
			],
			default: 'eu',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Token {{$credentials.token}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api{{$credentials.region === "eu" ? ".eu" : ""}}.mist.com',
			url: '/api/v1/self',
			method: 'GET',
		},
	};
}
