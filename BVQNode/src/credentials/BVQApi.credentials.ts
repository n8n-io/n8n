import type { 
	ICredentialType, 
	INodeProperties,
	ICredentialTestRequest,
	Icon,
	IconFile,
} from 'n8n-workflow';

export class BVQApi implements ICredentialType {
	name = 'bvqApi';
	displayName = 'BVQ API';
	icon: Icon = {
		light: 'file:bvq.png' as IconFile,
		dark: 'file:bvq.png' as IconFile,
	};
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';
	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
		},
		{
			displayName: 'API Base URL',
			name: 'apiBaseURL',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Ignore SSL issues',
			name: 'ignoreSslIssues',
			type: 'boolean',
			default: false,
			description: 'Accept self-signed or invalid SSL certificates (unsafe)',
		}
	];

	test: ICredentialTestRequest = {
        request: {
			skipSslCertificateValidation: '={{$credentials.ignoreSslIssues}}',
            method: 'GET',
            url: '={{ $credentials.apiBaseURL.endsWith("/") ? $credentials.apiBaseURL + "me" : $credentials.apiBaseURL + "/me" }}',
            auth: {
                username: '={{ $credentials.username }}',
                password: '={{ $credentials.password }}',
            },
        },
    };
}