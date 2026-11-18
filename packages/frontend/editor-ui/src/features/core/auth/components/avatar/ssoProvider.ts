/**
 * Turns the host of an identity provider into the name people know it by, so
 * the dialog can say "From Google" rather than "From accounts.google.com".
 * Unknown hosts are shown as they are: for a company's own provider the host
 * is the name.
 */

const KNOWN_PROVIDERS: Array<[RegExp, string]> = [
	[/(^|\.)google\.com$/, 'Google'],
	[/(^|\.)(microsoftonline|microsoft|live|windows)\.(com|net)$/, 'Microsoft'],
	[/(^|\.)okta(preview)?\.com$/, 'Okta'],
	[/(^|\.)auth0\.com$/, 'Auth0'],
	[/(^|\.)github\.com$/, 'GitHub'],
	[/(^|\.)gitlab\.com$/, 'GitLab'],
	[/(^|\.)onelogin\.com$/, 'OneLogin'],
	[/(^|\.)pingone\.(com|eu|ca|asia)$/, 'PingOne'],
	[/(^|\.)jumpcloud\.com$/, 'JumpCloud'],
	[/(^|\.)zitadel\.(cloud|com)$/, 'ZITADEL'],
	[/(^|\.)apple\.com$/, 'Apple'],
	[/(^|\.)slack\.com$/, 'Slack'],
];

export function ssoProviderName(provider: string | undefined): string | undefined {
	if (!provider) return undefined;
	const host = provider.trim().toLowerCase();
	if (!host) return undefined;
	const known = KNOWN_PROVIDERS.find(([pattern]) => pattern.test(host));
	return known ? known[1] : host;
}
