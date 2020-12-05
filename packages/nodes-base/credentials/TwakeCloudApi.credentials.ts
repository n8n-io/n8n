import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class TwakeCloudApi implements ICredentialType {
	name = 'twakeCloudApi';
	displayName = 'Twake API';
	documentationUrl = 'twake';
	properties = [
		{
			displayName: 'Workspace Key',
			name: 'workspaceKey',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
	];
}
