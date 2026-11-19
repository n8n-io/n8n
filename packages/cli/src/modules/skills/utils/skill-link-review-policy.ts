import type { SkillLinkReviewReason } from '@n8n/api-types';
import { isIP } from 'node:net';

/**
 * The link shapes that need review at import. A change to this file changes a security
 * policy, so it needs approval from IAM (see OWNERS).
 *
 * Criterion for a domain: a public service where anyone can receive, store or redirect data,
 * with no relation to the owner of the skill.
 */
const REVIEW_DOMAIN_GROUPS: Array<{ domains: string[]; reason: SkillLinkReviewReason }> = [
	{ domains: ['pastebin.com', 'paste.ee'], reason: 'paste_site' },
	{ domains: ['webhook.site', 'requestbin.com'], reason: 'webhook_catcher' },
	{ domains: ['bit.ly', 'tinyurl.com'], reason: 'url_shortener' },
];

/** Why a link needs review at import, or undefined for an ordinary link. */
export function linkReviewReason(url: URL, domain: string): SkillLinkReviewReason | undefined {
	const address = domain.startsWith('[') ? domain.slice(1, -1) : domain;
	if (isIP(address)) return 'ip_address';
	if (url.protocol !== 'https:') return 'not_https';
	return REVIEW_DOMAIN_GROUPS.find(({ domains }) =>
		domains.some((base) => domain === base || domain.endsWith(`.${base}`)),
	)?.reason;
}
