import {
	requestUrl,
	type IAuthenticate,
	type ICredentialDataDecryptedObject,
	type ICredentialTestRequest,
	type ICredentialType,
	type IHttpRequestHelper,
	type IHttpRequestOptions,
	type INodeProperties,
	type WithRequestTarget,
} from 'n8n-workflow';

export class FormIoApi implements ICredentialType {
	name = 'formIoApi';

	displayName = 'Form.io API';

	documentationUrl = 'formiotrigger';

	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			default: 'cloudHosted',
			options: [
				{
					name: 'Cloud-Hosted',
					value: 'cloudHosted',
				},
				{
					name: 'Self-Hosted',
					value: 'selfHosted',
				},
			],
		},
		{
			displayName: 'Self-Hosted Domain',
			name: 'domain',
			type: 'string',
			default: '',
			placeholder: 'https://www.mydomain.com',
			displayOptions: {
				show: {
					environment: ['selfHosted'],
				},
			},
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'hidden',
			typeOptions: {
				expirable: true,
				password: true,
			},
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const base = credentials.domain || 'https://formio.form.io';
		const options = {
			headers: {
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body: {
				data: {
					email: credentials.email,
					password: credentials.password,
				},
			},
			url: requestUrl`${base}/user/login`,
			json: true,
			returnFullResponse: true,
		} satisfies WithRequestTarget<IHttpRequestOptions>;

		const responseObject = await this.helpers.httpRequest(options);
		const token = responseObject.headers['x-jwt-token'];

		return { token };
	}

	authenticate: IAuthenticate = {
		type: 'generic',
		properties: {
			headers: {
				'x-jwt-token': '={{ $credentials.token }}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.domain || "https://formio.form.io"}}',
			url: 'current',
		},
	};
}
