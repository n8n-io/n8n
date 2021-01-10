import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class BeeminderApi implements ICredentialType {
	name = 'beeminderApi';
	displayName = 'Beeminder API';
	properties = [
		{
			displayName: 'User',
			name: 'user',
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
