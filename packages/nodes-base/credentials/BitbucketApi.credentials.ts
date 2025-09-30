import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class BitbucketApi implements ICredentialType {
	name = 'bitbucketApi';

	displayName = 'Bitbucket API';

	documentationUrl = 'bitbucket';

	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
