import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class EgoiApi implements ICredentialType {
	name = 'egoiApi';
	displayName = 'e-goi API';
	documentationUrl = 'egoi';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
