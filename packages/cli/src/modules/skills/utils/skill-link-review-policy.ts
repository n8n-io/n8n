import type { SkillLinkReviewReason } from '@n8n/api-types';
import { isIP } from 'node:net';

/**
 * Link extraction and the link shapes that need review at import. A change to the shapes
 * changes a security policy.
 */
const URL_SCHEME = /(?:https?|wss?|ftp):\/\//;
const URL_HOST_AND_REST = /(?:\[[\d:a-f.]+\])?[^\s<>"'`()[\]{}|]*/;
const EXPLICIT_LINK_PREFIX = /(?:\]\([ \t]*|<|^ {0,3}\[[^[\]\r\n]+\]:[ \t]*)/;
const EXPLICIT_LINK_USER_INFO = /[^\s<>"'`()[\]{}/?#@]*@/;
const BARE_LINK_USER_INFO = /(?:[^\s<>"'`()[\]{}/?#@|]*@)?/;

// An underscore can precede a link. Keep pipes in explicit link user info, but use them
// to end bare links in table cells.
const URL_PATTERN = new RegExp(
	`(?<![a-z0-9])${URL_SCHEME.source}(?:(?<=${EXPLICIT_LINK_PREFIX.source}${URL_SCHEME.source})${EXPLICIT_LINK_USER_INFO.source}|${BARE_LINK_USER_INFO.source})${URL_HOST_AND_REST.source}`,
	'gim',
);

/** Sentence and Markdown punctuation that can follow a link. */
const TRAILING_PUNCTUATION = /[.,;:!?*_~…。，、；：！？）】」』\p{Pf}]+$/u;

/** A scheme with no address, such as the `https://` of `https://<host>`. */
const BARE_SCHEME = /^[a-z]+:\/\/$/i;

export function* extractSkillLinks(text: string) {
	for (const match of text.matchAll(URL_PATTERN)) {
		const link = match[0].replace(TRAILING_PUNCTUATION, '');
		if (BARE_SCHEME.test(link)) continue;
		const start = match.index;
		const url = URL.parse(link);
		// A fully qualified host name can end with a dot.
		const domain = url?.hostname.toLowerCase().replace(/\.+$/, '');
		yield { link, start, end: start + link.length, url, domain };
	}
}

// A public service where anyone can receive, store or redirect data independently of the skill owner.
const REVIEW_DOMAIN_GROUPS: Array<{ domains: string[]; reason: SkillLinkReviewReason }> = [
	{ domains: ['pastebin.com', 'paste.ee'], reason: 'paste_site' },
	{ domains: ['webhook.site', 'requestbin.com'], reason: 'webhook_catcher' },
	{ domains: ['bit.ly', 'tinyurl.com'], reason: 'url_shortener' },
];

/** Why a link needs review at import, or undefined for an ordinary link. */
export function linkReviewReason(
	url: URL | null,
	domain?: string,
): SkillLinkReviewReason | undefined {
	if (!url || !domain) return 'unreadable';
	const address = domain.startsWith('[') ? domain.slice(1, -1) : domain;
	if (isIP(address)) return 'ip_address';
	if (url.protocol !== 'https:') return 'not_https';
	return REVIEW_DOMAIN_GROUPS.find(({ domains }) =>
		domains.some((base) => domain === base || domain.endsWith(`.${base}`)),
	)?.reason;
}
