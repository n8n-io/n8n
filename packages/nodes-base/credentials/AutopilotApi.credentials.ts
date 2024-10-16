import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AutopilotApi implements ICredentialType {
	name = 'autopilotApi';

	displayName = 'Autopilot API';

	documentationUrl = 'autopilot';

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
