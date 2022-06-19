import {
	IAuthenticateBearer,
	ICredentialTestRequest,
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
	authenticate = {
		type: 'bearer',
		properties: {
			tokenPropertyName: 'workspaceKey',
		},
	} as IAuthenticateBearer;

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://plugins.twake.app/plugins/n8n',
			url: '/channel',
			method: 'POST',
		},
	};
}
