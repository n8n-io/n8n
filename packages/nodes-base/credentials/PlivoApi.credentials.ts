import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class PlivoApi implements ICredentialType {
	name = 'plivoApi';
	displayName = 'Plivo Api';
	documentationUrl = 'plivo';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'Auth ID',
			name: 'authId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}