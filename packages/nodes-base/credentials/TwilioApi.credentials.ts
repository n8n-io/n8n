import {
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';


export class TwilioApi implements ICredentialType {
	name = 'twilioApi';
	displayName = 'Twilio API';
	documentationUrl = 'twilio';
	properties: INodeProperties[] = [
		{
			displayName: 'Auth Type',
			name: 'authType',
			type: 'options',
			default: 'authToken',
			options: [
				{
					name: 'Auth Token',
					value: 'authToken',
				},
				{
					name: 'API Key',
					value: 'apiKey',
				},
			],
		},
		{
			displayName: 'Account SID',
			name: 'accountSid',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authType: [
						'authToken',
					],
				},
			},
		},
		{
			displayName: 'API Key SID',
			name: 'apiKeySid',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authType: [
						'apiKey',
					],
				},
			},
		},
		{
			displayName: 'API Key Secret',
			name: 'apiKeySecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					authType: [
						'apiKey',
					],
				},
			},
		},
	];
	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		if (credentials.authType === 'apiKey') {
			requestOptions.auth = {
				username: credentials.apiKeySid as string,
				password: credentials.apiKeySecret as string,
			};
		} else if (credentials.authType === 'authToken') {
			requestOptions.auth = {
				username: credentials.accountSid as string,
				password: credentials.authToken as string,
			};
		}
		return requestOptions;
	}
}
