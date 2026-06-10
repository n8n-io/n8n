export const CLOUD_SUFFIX = '.app.n8n.cloud';

const HTTPS_PREFIX = 'https://';

export type SignInPrefill = { kind: 'cloud'; slug: string } | { kind: 'custom'; url: string };

/**
 * Decompose a remembered instance URL into the sign-in form's two input modes:
 * a bare cloud slug when the URL is exactly `https://<slug>.app.n8n.cloud`,
 * the full URL in custom mode otherwise.
 */
export function toSignInPrefill(instanceUrl: string | null): SignInPrefill | null {
	if (!instanceUrl) return null;
	if (instanceUrl.startsWith(HTTPS_PREFIX) && instanceUrl.endsWith(CLOUD_SUFFIX)) {
		const slug = instanceUrl.slice(HTTPS_PREFIX.length, -CLOUD_SUFFIX.length);
		if (slug && !slug.includes('.') && !slug.includes('/')) return { kind: 'cloud', slug };
	}
	return { kind: 'custom', url: instanceUrl };
}
