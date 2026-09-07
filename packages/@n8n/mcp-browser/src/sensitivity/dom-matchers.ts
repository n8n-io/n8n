import {
	ASSIGNMENT_NAME,
	type CaptureBlockedReason,
	collectHit,
	CONCATENATED_ONLY,
	PARTIAL_TOKEN,
	UNDELIMITED_TOKEN,
	type SecretHit,
} from '../redaction/redact';
import { assignmentNames, expandToTokenSpan, tokenize } from '../redaction/token-span';

export const TESTID_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-qa'] as const;

// An identifier is not prose: `tokenizer-output` and `secretary-panel` carry a
// credential noun without naming one, so a vocabulary only counts at separators.
const identifierBoundary = (vocabulary: RegExp) =>
	new RegExp(`(^|[-_\\s])(?:${vocabulary.source})([-_\\s]|$)`, 'i');

// `clientSecret` names a secret as plainly as `client-secret` does, so give the
// hump the separator the boundary rule needs. Humpless runs (`tokenizer`) are
// untouched, which is what keeps them out.
const separateCamelHumps = (text: string) => text.replace(/([a-z0-9])([A-Z])/g, '$1-$2');

/** Shortest run we treat as opaque rather than prose. */
const MIN_OPAQUE_TOKEN_LENGTH = 16;

// Only excludes degenerate runs: a mask of repeated characters scores 0, while
// the flattest real secret shape (hex) still scores ~3.95.
const MIN_OPAQUE_TOKEN_ENTROPY = 2;

// A credential noun trailed by one of these describes the credential instead of
// being it: "Token expiry", "API key docs". Deliberately a denylist rather than
// requiring the noun to end the label: an unknown qualifier here over-redacts,
// whereas an unknown head noun ("Client secret value") would leak.
const QUALIFIED_LABEL_PATTERN =
	/\b(expir\w*|type|kind|status|state|policy|docs?|documentation|guide|help|name|id|created|updated|modified|date|time|commit|version|count|rotation|scopes?|fingerprint|hint|prefix|suffix|owner|author)\s*$/i;

const TESTID_VOCABULARY =
	/api[-_\s]?key|apikey|admin[-_\s]?key|access[-_\s]?token|auth[-_\s]?token|session[-_\s]?token|secret|credential|password|key/;

export const SENSITIVE_TESTID_PATTERN = identifierBoundary(TESTID_VOCABULARY);

export const SENSITIVE_ARIA_LABEL_PATTERN =
	/(api[-_\s]?key|secret[-_\s]?key|access[-_\s]?token|auth[-_\s]?token|client[-_\s]?secret|password|credential)/i;

export const SENSITIVE_FIELD_LABEL_PATTERN =
	/(secret|password|passcode|passphrase|token|api[-_\s]?key|access[-_\s]?key|private[-_\s]?key|credential)/i;

export const ARIA_PASSWORD_LABEL_PATTERN =
	/(password|passcode|secret|api[-_\s]?key|token|credential)/i;

export const PASSWORD_AUTOCOMPLETE_PATTERN =
	/(current-password|new-password|one-time-code|api-key|token|credential)/i;

export const COPY_BUTTON_PATTERN =
	/(^|\b)(copy|copier|copiar|copia|copiato|kopieren|コピー(?:する)?|复制|複製|복사)(\b|$)/i;

export const REVEAL_BUTTON_PATTERN =
	/(reveal|show|unhide|view).*(api\s*key|key|secret|token|password|credential)/i;

export const REVEAL_PHRASE_PATTERNS = [
	/you won't (?:see|be shown|be able to see|be able to retrieve|be able to access).*again/i,
	/(?:save|copy|store|keep|note|notiere).*(?:key|schlüssel|secret|token|password|credential|backup code|safe)/i,
	/(?:only|one) time.*(?:see|shown|show)/i,
	/(?:shown|show).*only once/i,
	/only show it once/i,
	/treat this as a password/i,
	/we won't show it to you again/i,
	/you cannot see this password again/i,
] as const;

export function getTestId(el: Element): string {
	for (const attr of TESTID_ATTRS) {
		const value = el.getAttribute(attr);
		if (value) return value;
	}
	return '';
}

export function elementLabel(el: Element, doc: Document): string {
	const aria = el.getAttribute('aria-label')?.trim();
	if (aria) return aria;
	const labelledBy = el.getAttribute('aria-labelledby');
	if (!labelledBy) return '';
	return labelledBy
		.split(/\s+/)
		.map((id) => doc.getElementById(id)?.textContent?.trim() ?? '')
		.filter(Boolean)
		.join(' ');
}

export function getLabelTextByControlIdMap(doc: Document): Map<string, string> {
	const byId = new Map<string, string>();
	for (const label of Array.from(doc.querySelectorAll('label[for]'))) {
		const target = label.getAttribute('for');
		const text = label.textContent?.trim();
		if (!target || !text) continue;
		const existing = byId.get(target);
		byId.set(target, existing ? `${existing} ${text}` : text);
	}
	return byId;
}

export function getAssociatedLabelText(
	el: Element,
	doc: Document,
	labelsByControlIdMap: Map<string, string>,
): string {
	const parts = [elementLabel(el, doc)];
	const id = el.getAttribute('id');
	if (id) parts.push(labelsByControlIdMap.get(id) ?? '');
	const wrapping = el.closest('label');
	if (wrapping) parts.push(wrapping.textContent ?? '');
	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' ');
}

const SENSITIVE_FIELD_ATTR_PATTERN = identifierBoundary(SENSITIVE_FIELD_LABEL_PATTERN);

// A trailing colon, asterisk or parenthetical is decoration, not the end of the
// label — without stripping it the qualifier rule below never anchors.
const LABEL_DECORATION = /(?:\s*(?:\([^()]*\)|\[[^\]]*\]|[:*.,;·—-]))+$/;

// A label is a few words; longer text only landed in the cell by accident, and
// `LABEL_DECORATION` backtracks quadratically over it. Skipping the strip there
// leaves the vocabulary test to run on undecorated text, which at worst
// over-redacts — the safe direction.
const MAX_LABEL_LENGTH = 200;

function labelEnd(text: string): string {
	if (!text) return '';
	const label = text.replace(/\s+/g, ' ').trim();
	return label.length > MAX_LABEL_LENGTH ? label : label.replace(LABEL_DECORATION, '');
}

function namesSecret(text: string, pattern: RegExp): boolean {
	const label = labelEnd(text);
	return pattern.test(label) && !QUALIFIED_LABEL_PATTERN.test(label);
}

// A row may label its value with a plain `td` rather than a `th`; the label
// vocabulary, not the tag, is what qualifies it.
const LABEL_PARTNER_TAGS = ['DT', 'TH', 'TD'];

/**
 * Whether a static value cell is named as holding a secret — by its label
 * partner or by its own attributes. Each source is judged separately, or the
 * trailing-qualifier rule would anchor to whichever source happened to be last.
 */
export function isSecretLabelledCell(el: Element): boolean {
	const prev = el.previousElementSibling;
	const partner = prev && LABEL_PARTNER_TAGS.includes(prev.tagName) ? prev.textContent : '';
	if (namesSecret(partner ?? '', SENSITIVE_FIELD_LABEL_PATTERN)) return true;
	// Five `getAttribute` calls per cell otherwise, on pages where most carry none.
	if (!el.hasAttributes()) return false;
	return (
		namesSecret(separateCamelHumps(el.getAttribute('id') ?? ''), SENSITIVE_FIELD_ATTR_PATTERN) ||
		// The test-id pass judges the same attribute, so it must agree with it.
		namesSecret(separateCamelHumps(getTestId(el)), SENSITIVE_TESTID_PATTERN)
	);
}

export function elementText(el: Element): string {
	const parts: string[] = [];
	for (const node of Array.from(el.childNodes)) {
		if (node.nodeType === node.TEXT_NODE) {
			const text = node.textContent?.trim();
			if (text) parts.push(text);
		} else if (node instanceof el.ownerDocument.defaultView!.Element) {
			const text = elementText(node);
			if (text) parts.push(text);
		}
	}
	return parts.join(' ').trim().replace(/\s+/g, ' ');
}

export function isSensitiveInput(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
	if (!(el instanceof el.ownerDocument.defaultView!.HTMLInputElement)) return false;
	const type = (el.getAttribute('type') ?? '').toLowerCase();
	const aria = el.getAttribute('aria-label') ?? '';
	const autocomplete = el.getAttribute('autocomplete') ?? '';
	const testId = getTestId(el);
	const readOnly = el.hasAttribute('readonly') || el.hasAttribute('disabled');
	const noSpell = el.getAttribute('spellcheck') === 'false';
	const value = el.getAttribute('value') ?? '';
	return (
		type === 'password' ||
		ARIA_PASSWORD_LABEL_PATTERN.test(aria) ||
		PASSWORD_AUTOCOMPLETE_PATTERN.test(autocomplete) ||
		(!!testId && SENSITIVE_TESTID_PATTERN.test(testId)) ||
		(readOnly && noSpell && value.length >= 20)
	);
}

export function sensitiveInputValues(el: Element): string[] {
	const values: string[] = [];
	const value = (el.getAttribute('value') ?? el.textContent)?.trim() ?? '';
	if (value) values.push(value);
	for (const attr of Array.from(el.attributes)) {
		if (!attr.name.startsWith('data-') || !SENSITIVE_TESTID_PATTERN.test(attr.name)) continue;
		const candidate = attr.value.trim();
		if (
			candidate.length >= MIN_OPAQUE_TOKEN_LENGTH &&
			!/\s/.test(candidate) &&
			!values.includes(candidate)
		) {
			values.push(candidate);
		}
	}
	return values;
}

export function hasButtonMatching(scope: Element, pattern: RegExp): boolean {
	for (const button of Array.from(scope.querySelectorAll('button, [role="button"]'))) {
		const label = button.getAttribute('aria-label')?.trim() ?? elementText(button);
		if (label && pattern.test(label)) return true;
	}
	return false;
}

export function shannonEntropy(value: string): number {
	if (!value) return 0;
	const counts = new Map<string, number>();
	for (const char of value) counts.set(char, (counts.get(char) ?? 0) + 1);
	let entropy = 0;
	for (const count of counts.values()) {
		const p = count / value.length;
		entropy -= p * Math.log2(p);
	}
	return entropy;
}

function opaqueTokens(text: string): string[] {
	return tokenize(text).filter(
		(token) =>
			token.length >= MIN_OPAQUE_TOKEN_LENGTH && shannonEntropy(token) >= MIN_OPAQUE_TOKEN_ENTROPY,
	);
}

/**
 * Opaque tokens from a container its label already confirmed, so length carries
 * the decision that entropy carries over a region.
 */
export function opaqueTokenCandidates(el: Element): SecretHit[] {
	const text = elementText(el);
	const rendered = opaqueTokens(text);
	// `elementText` spaces inline children apart, so a value split across them is
	// whole only in `textContent` — a spelling that appears nowhere in what the
	// model reads, which is why neither it nor the rendered fragments inside it
	// may become a credential.
	const seen = new Set(rendered);
	const concatenated = el.firstElementChild
		? opaqueTokens(el.textContent ?? '').filter((value) => !seen.has(value))
		: [];
	const names = new Set(assignmentNames(text));

	// Masked either way; the reason decides only whether it may be captured.
	const blocked = (value: string): CaptureBlockedReason | undefined => {
		if (names.has(value)) return ASSIGNMENT_NAME;
		if (concatenated.some((whole) => whole.includes(value))) return PARTIAL_TOKEN;
		return undefined;
	};

	return [
		...rendered.map((value): SecretHit => {
			const captureBlocked = blocked(value);
			return captureBlocked
				? { type: 'password', value, captureBlocked }
				: { type: 'password', value };
		}),
		...concatenated.map(
			(value): SecretHit => ({ type: 'password', value, captureBlocked: CONCATENATED_ONLY }),
		),
	];
}

// Scored on the inner match, reported as the whole token: a shape this class
// misses must not be split into fragments.
export function highEntropyCandidates(text: string): SecretHit[] {
	const hits = new Map<string, SecretHit>();
	for (const match of text.matchAll(/[A-Za-z0-9_/+=-]{20,}/g)) {
		if (shannonEntropy(match[0]) < 4.5) continue;
		const { span, delimited } = expandToTokenSpan(text, match.index, match[0].length);
		// Unlike a provider pattern, an entropy match is only ever a fragment of the
		// token it sits in, so the span — not the match — is the redaction target.
		const hit: SecretHit = delimited
			? { type: 'secret', value: span }
			: { type: 'secret', value: match[0], captureBlocked: UNDELIMITED_TOKEN };
		if (hit.value !== match[0]) hit.match = match[0];
		collectHit(hits, hit);
	}
	return [...hits.values()];
}
