import { defineCredential } from '@n8n/node-sdk/credentials';

/**
 * A Google OAuth2 credential type of one service, e.g. `gmailOAuth2`. Each one extends the legacy
 * `googleOAuth2Api`, so the editor's Google sign-in and the instance overwrites of that type
 * apply. Only the scopes and the notice differ.
 */
export function googleOAuth2<
	const Id extends `${string}.${string}`,
	const Name extends string,
>(spec: {
	readonly id: Id;
	readonly legacyName: Name;
	readonly displayName: string;
	readonly scope: readonly string[];
	readonly hosts?: readonly string[];
	/** A text for hosted n8n, e.g. the APIs to turn on in the Google Cloud Console. */
	readonly notice?: string;
}) {
	return defineCredential({
		id: spec.id,
		legacyName: spec.legacyName,
		displayName: spec.displayName,
		docs: 'google/oauth-single-service',
		legacyParent: 'googleOAuth2Api',
		...(spec.hosts ? { hosts: spec.hosts } : {}),
		auth: (a) =>
			a.oauth2.authorizationCode({
				authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenEndpoint: 'https://oauth2.googleapis.com/token',
				scope: spec.scope,
				clientAuth: 'client_secret_post',
				pkce: false,
				// Google gives a refresh token only for offline access with a consent prompt.
				authorizationQuery: { access_type: 'offline', prompt: 'consent' },
				editableScopes: true,
			}),
		...(spec.notice ? { notice: { text: spec.notice, deployment: 'hosted' } } : {}),
	});
}
