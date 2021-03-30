import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SalesmateApi implements ICredentialType {
	name = 'salesmateApi';
	displayName = 'Salesmate API';
	documentationUrl = 'salesmate';
	properties = [
		{
			displayName: 'Session Token',
			name: 'sessionToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'n8n.salesmate.io',
		},
	];
}
