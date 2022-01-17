import {
	// IAuthenticateBasicAuth,
	// IAuthenticateBearer,
	IAuthenticateHeaderAuth,
	// ICredentialDataDecryptedObject,
	ICredentialType,
	// IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class AsanaApi implements ICredentialType {
	name = 'asanaApi';
	displayName = 'Asana API';
	documentationUrl = 'asana';
	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];


	// async authenticate(credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions): Promise<IHttpRequestOptions> {
	// 	console.log('AsanaApi.authenticate');
	// 	requestOptions.headers!['Authorization'] = `Bearer ${credentials.accessToken}`;
	// 	return requestOptions;
	// }


	// authenticate = {
	// 	type: 'bearer',
	// 	properties: {
	// 		tokenPropertyName: 'accessToken', // Should be by default accessToken, only has to be defined if different
	// 	},
	// } as IAuthenticateBearer;


	authenticate = {
		type: 'headerAuth',
		properties: {
			name: 'Authorization',
			value: '=Bearer {{$credentials.accessToken}}',
		},
	} as IAuthenticateHeaderAuth;

	// authenticate = {
	// 	type: 'basicAuth',
	// 	properties: {
	// 		// userPropertyName: 'user',
	// 		// passwordPropertyName: 'password',
	// 	},
	// } as IAuthenticateBasicAuth;

}
