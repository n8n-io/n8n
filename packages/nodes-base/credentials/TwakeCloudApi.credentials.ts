import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class TwakeCloudApi implements ICredentialType {
	name = 'twakeCloudApi';
	displayName = 'Twake Cloud API';
	documentationUrl = 'twake';
	properties: INodeProperties[] = [
		{
			displayName: 'Workspace Key',
			name: 'workspaceKey',
			type: 'string',
			default: '',
		},
	];
}
