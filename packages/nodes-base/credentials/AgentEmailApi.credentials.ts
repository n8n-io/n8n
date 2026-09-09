import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class AgentEmailApi implements ICredentialType {
	name = 'agentEmailApi';

	displayName = 'Agent Email API';

	documentationUrl = 'agentemail';

	hidden = true;

	restrictToSupportedNodes = true as const;

	supportedNodes = [];

	properties: INodeProperties[] = [
		{
			displayName: 'Channel ID',
			name: 'channelId',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Email Address',
			name: 'address',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Callback Secret',
			name: 'callbackSecret',
			type: 'hidden',
			typeOptions: { password: true },
			default: '',
		},
	];
}
