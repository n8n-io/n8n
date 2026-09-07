import type { CallToolResult } from '../types';
import { BUILTIN_PATTERNS, type SecretPattern } from './patterns';
import { expandToTokenSpan, type TokenSpan } from './token-span';

export interface SecretHit {
	type: string;
	value: string;
	/**
	 * What the detector matched, when `value` is wider than it. Two sightings of
	 * one secret are the same hit even when their spans differ, so this — not the
	 * span — identifies it.
	 */
	match?: string;
	ref?: string;
	/**
	 * The whole token the match sits in, read by capturing so a detector boundary
	 * cannot truncate the stored value. Redaction keeps using `value`: a widened
	 * span is a guess, and markers are what the model has already seen.
	 */
	captureValue?: string;
	/** Why this hit must not become a credential, when it must not. */
	captureBlocked?: CaptureBlockedReason;
}

type RedactionMarkerHit = Pick<SecretHit, 'type' | 'value' | 'ref'>;

const GLOBAL_PATTERNS: ReadonlyArray<{ slug: string; regex: RegExp }> = BUILTIN_PATTERNS.map(
	(p: SecretPattern) => ({
		slug: p.slug,
		regex: new RegExp(
			p.pattern.source,
			p.pattern.flags.includes('g') ? p.pattern.flags : `${p.pattern.flags}g`,
		),
	}),
);

export const REDACTION_MARKER_PATTERN = /\[REDACTED:[^\]]+\](?:@[\w-]+)?/;

export function containsRedactionMarker(value: string): boolean {
	return REDACTION_MARKER_PATTERN.test(value);
}

export function formatRedactionMarker(
	hit: Pick<SecretHit, 'type' | 'ref'> & { index?: number },
): string {
	const suffix = hit.index === undefined ? '' : `:${hit.index}`;
	return `[REDACTED:${hit.type}${suffix}]${hit.ref ? `@${hit.ref}` : ''}`;
}

function hitKey(hit: RedactionMarkerHit): string {
	return `${hit.type}:${hit.value}:${hit.ref ?? ''}`;
}

export function createRedactionMarkerFormatter(
	hits: RedactionMarkerHit[],
): (hit: RedactionMarkerHit) => string {
	const indexes = new Map<string, number>();
	for (const hit of hits) {
		const key = hitKey(hit);
		if (!indexes.has(key)) indexes.set(key, indexes.size + 1);
	}
	return (hit) => formatRedactionMarker({ ...hit, index: indexes.get(hitKey(hit)) });
}

export function findRegexSecretHits(input: string): SecretHit[] {
	const hits = new Map<string, SecretHit>();
	for (const { slug, regex } of GLOBAL_PATTERNS) {
		regex.lastIndex = 0;
		for (const match of input.matchAll(regex)) {
			const value = match[0];
			if (!value) continue;
			collectHit(
				hits,
				hitForSpan(slug, value, expandToTokenSpan(input, match.index, value.length)),
			);
		}
	}
	return [...hits.values()];
}

// Each completes "<value> cannot be captured because …" in `browser_capture_secret`.
export const UNDELIMITED_TOKEN = 'its surrounding text has no delimiter';

export const CONCATENATED_ONLY = 'it only appears where markup runs text together';
export const PARTIAL_TOKEN = 'it is only part of a value the markup splits apart';
export const ASSIGNMENT_NAME = 'it names the value rather than being it';

/** Why a hit may still be redacted but must never become a credential. */
export type CaptureBlockedReason =
	| typeof UNDELIMITED_TOKEN
	| typeof CONCATENATED_ONLY
	| typeof PARTIAL_TOKEN
	| typeof ASSIGNMENT_NAME;

/** The value capturing would store, which is the whole token when one was found. */
export function captureSpanOf(hit: SecretHit): string {
	return hit.captureValue ?? hit.value;
}

/** Fixed-count patterns match only part of a longer token, so record the span. */
function hitForSpan(type: string, value: string, { span, delimited }: TokenSpan): SecretHit {
	if (!delimited) return { type, value, captureBlocked: UNDELIMITED_TOKEN };
	return span === value ? { type, value } : { type, value, captureValue: span };
}

/**
 * The same secret seen again — in another occurrence, pass, or document. An
 * occurrence inside an undelimitable run says nothing about how far the token
 * reaches, so a delimited span always beats a blocked one; among delimited spans
 * the narrowest wins, since a wider one carries its neighbours into the value.
 */
/**
 * Record a hit, merging it with any earlier sighting of the same secret. Owning
 * the identity here keeps every detector on one rule: callers that chose their
 * own key drifted apart, and one of them stopped merging at all.
 */
export function collectHit(hits: Map<string, SecretHit>, hit: SecretHit): void {
	if (!hit.value) return;
	const key = `${hit.type}:${hit.match ?? hit.value}:${hit.ref ?? ''}`;
	const existing = hits.get(key);
	hits.set(key, existing ? narrowerCapture(existing, hit) : hit);
}

/**
 * An occurrence inside an undelimitable run says nothing about how far the token
 * reaches, so a delimited span always beats a blocked one.
 *
 * Two delimited sightings can still disagree, either because one is wrapped
 * (`session.<key>`) or because two tokens share a fragment (`alpha.<key>` and
 * `bravo.<key>`). Picking one span would leave the other sighting unreplaced, so
 * fall back to the match: it is the only text common to both, and therefore the
 * part that has to be replaced in every one of them.
 */
export function narrowerCapture(existing: SecretHit, incoming: SecretHit): SecretHit {
	if (incoming.captureBlocked) return existing;
	if (existing.captureBlocked) return incoming;
	if (captureSpanOf(existing) === captureSpanOf(incoming)) return existing;

	const shared: SecretHit = { type: existing.type, value: existing.match ?? existing.value };
	if (existing.ref) shared.ref = existing.ref;
	return shared;
}

type Replacement = readonly [value: string, marker: string];

/**
 * Longest value first: where an entropy span contains a pattern's shorter match,
 * replacing the short one first leaves the rest of the token visible. Build once
 * per call, then apply to every string.
 */
function buildReplacements(
	hits: readonly SecretHit[],
	marker: (hit: RedactionMarkerHit) => string,
): Replacement[] {
	return [...hits]
		.sort((a, b) => b.value.length - a.value.length)
		.map((hit) => [hit.value, marker(hit)] as const);
}

function applyReplacements(input: string, replacements: readonly Replacement[]): string {
	let output = input;
	for (const [value, marker] of replacements) output = replaceLiteral(output, value, marker);
	return output;
}

export function redactString(input: string): string {
	const hits = findRegexSecretHits(input);
	return applyReplacements(input, buildReplacements(hits, createRedactionMarkerFormatter(hits)));
}

function replaceLiteral(input: string, value: string, replacement: string): string {
	if (!value) return input;
	return input.split(value).join(replacement);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (value === null || typeof value !== 'object') return false;
	return Object.getPrototypeOf(value) === Object.prototype;
}

function collectStrings(value: unknown): string[] {
	if (value === null || value === undefined) return [];
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap((entry) => collectStrings(entry));
	if (isPlainObject(value)) {
		return Object.values(value).flatMap((entry) => collectStrings(entry));
	}
	return [];
}

function replaceInValue(value: unknown, replacements: readonly Replacement[]): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === 'string') return applyReplacements(value, replacements);
	if (Array.isArray(value)) return value.map((entry) => replaceInValue(entry, replacements));
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = replaceInValue(v, replacements);
		}
		return out;
	}
	return value;
}

export function applyHitsToResult(
	result: CallToolResult,
	hits: readonly SecretHit[],
): CallToolResult {
	const replacements = buildReplacements(hits, createRedactionMarkerFormatter([...hits]));

	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			item.text = applyReplacements(item.text, replacements);
		}
	}
	if (result.structuredContent !== undefined) {
		const redacted = replaceInValue(result.structuredContent, replacements);
		if (isPlainObject(redacted)) result.structuredContent = redacted;
	}
	return result;
}

export function redactCallToolResult(result: CallToolResult): CallToolResult {
	const texts = [
		...result.content.flatMap((item) =>
			item.type === 'text' && typeof item.text === 'string' ? [item.text] : [],
		),
		...collectStrings(result.structuredContent),
	];
	return applyHitsToResult(result, findRegexSecretHits(texts.join('\n')));
}
