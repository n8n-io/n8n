import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class NetgsmApi implements ICredentialType {
	name = 'netgsmApi';

	displayName = 'Netgsm API';

	documentationUrl = 'netgsm';

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
	];

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const base64Key = Buffer.from(`${credentials.username}:${credentials.password}`).toString(
			'base64',
		);
		requestOptions.headers!.Authorization = `Basic ${base64Key}`;
		return requestOptions;
	}
}
