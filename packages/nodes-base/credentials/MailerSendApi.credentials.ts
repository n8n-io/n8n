import {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	NodePropertyTypes,
} from 'n8n-workflow';

export class MailerSendApi implements ICredentialType {
	name = 'mailerSendApi';
	displayName = 'MailerSend API';
	documentationUrl = 'mailerSend';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];

	async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
		requestOptions.headers!['Authorization'] = `Bearer ${credentials.apiKey}`;
		return requestOptions;
	}

}
