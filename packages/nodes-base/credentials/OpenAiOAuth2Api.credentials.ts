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

	hideOAuthRedirectUrl = true;

	hideDomainRestrictionFields = true;

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
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://auth.openai.com/oauth/token',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'hidden',
			default: OPENAI_CODEX_CLIENT_ID,
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
		{
			// Declared `hidden` so `useCredentialOAuth` does not stamp `'none'` into a
			// credential created through the one-click OAuth flow. It also overrides the
			// `options` field that `oAuth2Api` (a `genericAuth` parent) gets injected and
			// that we would otherwise inherit — `hideDomainRestrictionFields` only skips
			// injection into this type's own properties. The `'all'` default in turn keeps
			// the dependent `allowedDomains` field hidden.
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: 'all',
		},
	];
}
