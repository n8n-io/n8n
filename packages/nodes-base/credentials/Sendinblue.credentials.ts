import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Sendinblue implements ICredentialType {
	name = 'sendinblue';
	displayName = 'Sendinblue';
	properties = [
		{
			displayName: 'API-Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
			typeOptions: {
				password: true,
			},
			description: 'The API-Key provided by Sendinblue',
		},
	];
}
