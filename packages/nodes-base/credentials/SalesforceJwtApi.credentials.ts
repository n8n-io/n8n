import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SalesforceJwtApi implements ICredentialType {
	name = 'salesforceJwtApi';
	displayName = 'Salesforce JWT API';
	documentationUrl = 'salesforce';
	properties = [
		{
			displayName: 'Environment Type',
			name: 'environment',
			type: 'options' as NodePropertyTypes,
			options: [
				{
					name: 'Production',
					value: 'production',
				},
				{
					name: 'Sandbox',
					value: 'sandbox',
				},
			],
			default: 'production',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
			description: 'Consumer Key from Salesforce Connected App.',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
			required: true,
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Use the multiline editor.  Make sure it is in standard PEM key format:<br />-----BEGIN PRIVATE KEY-----<br />KEY DATA GOES HERE<br />-----END PRIVATE KEY-----',
		},
	];
}
