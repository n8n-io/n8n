import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CloudinaryApi implements ICredentialType {
	name = 'cloudinaryApi';

	displayName = 'Cloudinary API';

	documentationUrl = 'https://cloudinary.com/documentation/image_upload_api_reference';

	properties: INodeProperties[] = [
		{
			displayName: 'Cloud Name',
			name: 'cloudName',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'API Secret',
			name: 'apiSecret',
			type: 'string',
			default: '',
			typeOptions: { password: true },
		},
	];

	// This tells how this credential is authenticated
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			auth: {
				username: '={{$credentials.apiKey}}',
				password: '={{$credentials.apiSecret}}',
			},
		},
	};

	// The block below tells how this credential can be tested
	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://api.cloudinary.com/v1_1/{{$credentials?.cloudName}}',
			url: '/ping',
		},
	};
}
