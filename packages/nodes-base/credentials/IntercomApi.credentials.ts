import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class IntercomApi implements ICredentialType {
	name = 'intercomApi';
	displayName = 'Intercom API';
	documentationUrl = 'intercom';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
