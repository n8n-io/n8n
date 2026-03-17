import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FacebookGraphAppOAuth2Api implements ICredentialType {
	name = 'facebookGraphAppOAuth2Api';

	displayName = 'Facebook Graph (App) OAuth2 API';

	extends = ['facebookGraphApiOAuth2Api'];

	documentationUrl = 'facebookapp';

	properties: INodeProperties[] = [
		{
			displayName: 'App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'(Optional) When set, the node will verify incoming webhook payloads for added security',
		},
	];
}
