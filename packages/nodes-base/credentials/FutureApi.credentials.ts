import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class FutureApi implements ICredentialType {
	name = 'futureApiCredentials';
	displayName = 'Future API Token';
	documentationUrl = 'futureDocumentionUrl';
	properties = [
		{
			displayName: 'Token Key',
			name: 'token',
			type: 'string' as NodePropertyTypes,
			default: ''
		}
	];
}
