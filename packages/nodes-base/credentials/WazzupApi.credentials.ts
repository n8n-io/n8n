import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class WazzupApi implements ICredentialType {
	name = 'wazzupApi';
	displayName = 'Wazzup API';
	documentationUrl = 'whatsapp';
	properties = [
		{
			displayName: 'Auth Token',
			name: 'authToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
