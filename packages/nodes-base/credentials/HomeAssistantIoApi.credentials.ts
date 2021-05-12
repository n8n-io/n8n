import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class HomeAssistantIoApi implements ICredentialType {
	name = 'homeAssistantIoApi';
	displayName = 'Home Assistant Io Api';
	documentationUrl = 'homeAssistantIo';
	properties = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
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
	];
}
