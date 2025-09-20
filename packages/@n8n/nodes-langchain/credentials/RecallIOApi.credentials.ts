import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestMethods,
	INodeProperties,
} from 'n8n-workflow';

export class RecallIOApi implements ICredentialType {
	name = 'recallioApi';
	displayName = 'RecallIO API';
	documentationUrl = 'https://app.recallio.ai/docs';
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
				Authorization: '={{"Bearer " + $credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'GET' as IHttpRequestMethods,
			url: 'https://app.recallio.ai/api/Memory/validate-key',
			headers: {
				Authorization: '={{"Bearer " + $credentials.apiKey}}',
			},
		},
	};
}
