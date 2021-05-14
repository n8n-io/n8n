import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class UptimeRobotApi implements ICredentialType {
	name = 'uptimeRobotApi';
	displayName = 'Uptime Robot API';
	documentationUrl = 'uptimeRobot';
	properties = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
