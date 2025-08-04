import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = [
	'https://www.googleapis.com/auth/chat.spaces',
	'https://www.googleapis.com/auth/chat.messages',
	'https://www.googleapis.com/auth/chat.memberships',
];

export class GoogleChatOAuth2Api implements ICredentialType {
	name = 'googleChatOAuth2Api';

	extends = ['googleOAuth2Api'];

	displayName = 'Chat OAuth2 API';

	documentationUrl = 'google/oauth-single-service';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
