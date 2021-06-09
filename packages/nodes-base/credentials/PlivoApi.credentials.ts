import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class PlivoApi implements ICredentialType {
	name = 'plivoApi';
	displayName = 'Plivo API';
	documentationUrl = 'plivo';
	properties = [
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
