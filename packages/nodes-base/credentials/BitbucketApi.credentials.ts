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
		/**
		 * @deprecated App password will stop working after June 9th 2026. Use API token for new credentials.
		 */
		{
			displayName: 'App Password',
			hint: 'App Passwords will be disabled after June 8th 2026',
			name: 'appPassword',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
	];
}
