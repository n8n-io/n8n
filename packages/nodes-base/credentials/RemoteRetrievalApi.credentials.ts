import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RemoteRetrievalApi implements ICredentialType {
	name = 'RemoteRetrievalApi';
	displayName = 'Remote Retrieval API';
	documentationUrl = 'https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://remoteretrieval.com/RR-enterprise/remoteretrieval/public/api/v1/', // Default base URL
			description: 'Base URL for the Remote Retrieval API.',
		},
	];

	// Authentication configuration
	authenticate = {
		type: 'generic',
		properties: {
			headers: {
				'Authorization': '=Bearer {{$credentials.apiKey}}',
				'Content-Type': 'application/json',
			},
		},
	} as IAuthenticateGeneric;

	// Test the credentials

}