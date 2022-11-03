import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class UptimeRobotApi implements ICredentialType {
	name = 'uptimeRobotApi';
	displayName = 'Uptime Robot API';
	documentationUrl = 'uptimeRobot';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
