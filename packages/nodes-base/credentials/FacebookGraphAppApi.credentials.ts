import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FacebookGraphAppApi implements ICredentialType {
	name = 'facebookGraphAppApi';

	displayName = 'Facebook Graph API (App)';

	documentationUrl = 'facebookapp';

	extends = ['facebookGraphApi'];

	properties: INodeProperties[] = [
		{
			displayName: 'App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'(Optional) When set, the node will sign API calls and verify incoming webhook payloads for added security',
		},
	];
}
