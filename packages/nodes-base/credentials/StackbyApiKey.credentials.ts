import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class StackbyApiKey implements ICredentialType {
	name = 'stackbyApiKey';
	displayName = 'Stackby Api Key';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'Api Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
