import type { ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * OAuth2 / OIDC credential used to authenticate **end users** (form visitors,
 * etc.) — not for n8n calling third-party APIs. Extends the generic `oAuth2Api`
 * so the same fields apply, but is used with a different set of redirect URIs
 * (the form-login callback paths) which the credential UI surfaces separately.
 *
 * Initial consumer: the Form Trigger's `OAuth2 / OIDC Login` authentication
 * mode. Designed to be reusable for other webhook-style triggers that want
 * end-user login (e.g., a Chat trigger) without disturbing the existing
 * `oAuth2Api` credential semantics (which assume the credential owner has
 * already exchanged a token that gets stored on the record).
 */
export class OAuth2LoginApi implements ICredentialType {
	name = 'oAuth2LoginApi';

	displayName = 'OAuth2 / OIDC Login';

	extends = ['oAuth2Api'];

	documentationUrl = 'form-trigger';

	properties: INodeProperties[] = [
		{
			displayName:
				'This credential authenticates <strong>form visitors</strong>, not n8n itself. Use the redirect URL(s) shown below when registering your OAuth client at the identity provider. For standard claims (name, email, picture) include scopes <code>openid profile email</code>.',
			name: 'notice',
			type: 'notice',
			default: '',
		},
	];
}
