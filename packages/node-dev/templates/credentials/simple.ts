import { ICredentialType, NodePropertyTypes } from 'n8n-workflow';

export class ClassNameReplace implements ICredentialType {
	name = 'N8nNameReplace';

	displayName = 'DisplayNameReplace';

	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'User',
			name: 'user',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
