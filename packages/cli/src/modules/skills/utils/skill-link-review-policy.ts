import { isIP } from 'node:net';

/**
 * The link shapes that need review at import. A change to this file changes a security
 * policy, so it needs approval from IAM (see OWNERS).
 *
 * Criterion for a domain: a public service where anyone can receive, store or redirect data,
 * with no relation to the owner of the skill.
 */
const REVIEW_DOMAIN_GROUPS = [
	{ domains: ['pastebin.com', 'paste.ee'], reason: 'it uses a paste site' },
	{ domains: ['webhook.site', 'requestbin.com'], reason: 'it uses a webhook catcher' },
	{ domains: ['bit.ly', 'tinyurl.com'], reason: 'it uses a URL shortener' },
];

/** Why a link needs review at import, or undefined for an ordinary link. */
export function linkReviewReason(url: URL, domain: string): string | undefined {
	const address = domain.startsWith('[') ? domain.slice(1, -1) : domain;
	if (isIP(address)) return 'it uses an IP address';
	if (url.protocol !== 'https:') return 'it does not use HTTPS';
	return REVIEW_DOMAIN_GROUPS.find(({ domains }) =>
		domains.some((base) => domain === base || domain.endsWith(`.${base}`)),
	)?.reason;
}
