import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

const OPENAI_CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const OPENAI_CODEX_SCOPES = 'openid profile email offline_access';

export class OpenAiOAuth2Api implements ICredentialType {
	name = 'openAiOAuth2Api';

	extends = ['oAuth2Api'];

	// eslint-disable-next-line n8n-nodes-base/cred-class-field-display-name-missing-oauth2
	displayName = 'OpenAI Account (ChatGPT)';

	icon: Icon = 'node:n8n-nodes-base.openAi';

	documentationUrl = 'openai';

	__hideOAuthRedirectUrl = true;

	__skipHttpRequestDomainRestrictions = true;

	properties: INodeProperties[] = [
		{
			displayName:
				'Use this credential to connect your ChatGPT/OpenAI account with device-code login. n8n will save the OAuth token automatically.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://auth.openai.com/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.openai.com/oauth/token',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'hidden',
			default: OPENAI_CODEX_CLIENT_ID,
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'hidden',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: OPENAI_CODEX_SCOPES,
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
