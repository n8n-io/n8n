import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class GllueTriggerApi implements ICredentialType {
	name = 'gllueTriggerApi';
	displayName = 'Gllue Trigger API';
	documentationUrl = 'support@gllue.com';
	properties = [
		{
			displayName: 'Token',
			name: 'apiToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
