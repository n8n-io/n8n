import {
	IAuthenticate,
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
	NodePropertyTypes,
} from 'n8n-workflow';

import set from 'lodash.set';

export class WhatsAppApi implements ICredentialType {
	name = 'whatsAppApi';
	displayName = 'WhatsApp API';
	documentationUrl = 'whatsApp';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			type: 'string',
			name: 'accessToken',
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
}
