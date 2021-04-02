import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class AutopilotApi implements ICredentialType {
	name = 'autopilotApi';
	displayName = 'Autopilot API';
	documentationUrl = 'autopilot';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
