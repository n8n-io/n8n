import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';


export class GitlabApi implements ICredentialType {
	name = 'gitlabApi';
	displayName = 'Gitlab API';
	documentationUrl = 'gitlab';
	properties: INodeProperties[] = [
		{
			displayName: 'Gitlab Server',
			name: 'server',
			type: 'string',
			default: 'https://gitlab.com',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			default: '',
		},
	];
}
