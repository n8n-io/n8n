import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class JenkinsApi implements ICredentialType {
	name = 'jenkinsApi';

	displayName = 'Jenkins API';

	documentationUrl = 'jenkins';

	properties: INodeProperties[] = [
		{
			displayName: 'Jenkins Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Personal API Token',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Jenkins Instance URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
		},
	];
}
