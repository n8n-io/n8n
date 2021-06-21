import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class BaserowApi implements ICredentialType {
	name = 'baserowApi';
	displayName = 'Baserow API';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
