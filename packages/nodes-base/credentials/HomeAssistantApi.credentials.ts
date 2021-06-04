import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HomeAssistantApi implements ICredentialType {
	name = 'homeAssistantApi';
	displayName = 'Home Assistant API';
	documentationUrl = 'homeAssistant';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 8123,
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'boolean' as NodePropertyTypes,
			default: false,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
