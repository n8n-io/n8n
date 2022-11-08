import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MailchimpApi implements ICredentialType {
	name = 'mailchimpApi';
	displayName = 'Mailchimp API';
	documentationUrl = 'mailchimp';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=apikey {{$credentials.apiKey}}',
			},
		},
	};
	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.apiKey.split("-").pop()}}.api.mailchimp.com/3.0',
			url: '/lists',
		},
	};
}
