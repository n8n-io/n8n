import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class ActionNetworkApi implements ICredentialType {
	name = 'actionNetworkApi';
	displayName = 'Action Network API';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
