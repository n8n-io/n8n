/**
 * Inline resource tokens in chat messages, such as an @-mention of a workflow.
 *
 * A token is stored in the message text as a markdown link with a leading `@`:
 * `[@Orders](n8n-resource://workflow/abc)`. The text stays readable for a model
 * and for a person, keeps the position of each mention, and survives a reload
 * without a separate store. Only `n8n-resource://` targets form a token, so a
 * normal markdown link that a user types stays a link.
 */

export const CHAT_TOKEN_SCHEME = 'n8n-resource://';

/** One inline token: the label that the user sees and the resource that it points to. */
export interface ChatToken {
	label: string;
	href: string;
}

/** A piece of message text: plain text or a token. */
export type ChatTokenSegment = { type: 'text'; text: string } | ({ type: 'token' } & ChatToken);

const MAX_LABEL_LENGTH = 200;
const MAX_HREF_LENGTH = 1000;

function tokenPattern(): RegExp {
	return new RegExp(
		`\\[@([^\\]\\n]{1,${MAX_LABEL_LENGTH}})\\]\\((n8n-resource:\\/\\/[^\\s()]{1,${MAX_HREF_LENGTH}})\\)`,
		'g',
	);
}

/** `[`, `]` and line breaks would end the label early, so they become spaces. */
function cleanLabel(label: string): string {
	const cleaned = label
		.replace(/[[\]\r\n]+/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim()
		.slice(0, MAX_LABEL_LENGTH);
	return cleaned || '?';
}

/** Whitespace and parentheses would end the target early, so they are percent-encoded. */
function cleanHref(href: string): string {
	return href.replace(
		/[\s()]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`,
	);
}

/** The text form of a token, for example `[@Orders](n8n-resource://workflow/abc)`. */
export function formatChatToken(token: ChatToken): string {
	return `[@${cleanLabel(token.label)}](${cleanHref(token.href)})`;
}

/** Splits message text into plain text and tokens, in order. */
export function splitChatTokens(text: string): ChatTokenSegment[] {
	const segments: ChatTokenSegment[] = [];
	let last = 0;
	for (const match of text.matchAll(tokenPattern())) {
		const index = match.index ?? 0;
		if (index > last) segments.push({ type: 'text', text: text.slice(last, index) });
		segments.push({ type: 'token', label: match[1], href: match[2] });
		last = index + match[0].length;
	}
	if (last < text.length) segments.push({ type: 'text', text: text.slice(last) });
	return segments;
}

/** The tokens of a message, in order. */
export function listChatTokens(text: string): ChatToken[] {
	return [...text.matchAll(tokenPattern())].map((match) => ({ label: match[1], href: match[2] }));
}

/** Message text with each token written as `@label`, for places that show plain text. */
export function chatTokensToPlainText(text: string): string {
	return text.replace(tokenPattern(), (_match, label: string) => `@${label}`);
}

/**
 * A resource target, for example `n8n-resource://node/<workflowId>/<nodeId>`.
 * `encodeURIComponent` keeps parentheses, and `formatChatToken` encodes them,
 * so they are encoded here too: a target must stay the same in a token.
 */
export function formatChatResourceHref(kind: string, ...ids: string[]): string {
	return `${CHAT_TOKEN_SCHEME}${kind}/${ids.map((id) => cleanHref(encodeURIComponent(id))).join('/')}`;
}

/** The kind and the decoded ids of a resource target, or `undefined` for another target. */
export function parseChatResourceHref(href: string): { kind: string; ids: string[] } | undefined {
	if (!href.startsWith(CHAT_TOKEN_SCHEME)) return undefined;
	const [kind, ...rawIds] = href.slice(CHAT_TOKEN_SCHEME.length).split('/');
	if (!kind || rawIds.length === 0 || rawIds.some((id) => !id)) return undefined;
	try {
		return { kind, ids: rawIds.map((id) => decodeURIComponent(id)) };
	} catch {
		return undefined;
	}
}
