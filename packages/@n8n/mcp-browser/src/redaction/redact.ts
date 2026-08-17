import type { CallToolResult } from '../types';
import { BUILTIN_PATTERNS, type SecretPattern } from './patterns';
import { expandToTokenSpan } from './token-span';

export interface SecretHit {
	type: string;
	value: string;
	ref?: string;
	/**
	 * The whole token the match sits in, read by capturing so a detector boundary
	 * cannot truncate the stored value. Redaction keeps using `value`: a widened
	 * span is a guess, and markers are what the model has already seen.
	 */
	captureValue?: string;
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
			const key = `${slug}:${value}`;
			// Fixed-count patterns match only their first N characters of a longer
			// token, so record the whole token for capturing.
			const span = expandToTokenSpan(input, match.index, value.length);
			const existing = hits.get(key);
			if (!existing) {
				const hit: SecretHit = { type: slug, value };
				if (span !== value) hit.captureValue = span;
				hits.set(key, hit);
			} else if (span.length < (existing.captureValue ?? existing.value).length) {
				// Narrowest wins: a wider span carries its neighbours into the value.
				if (span === value) delete existing.captureValue;
				else existing.captureValue = span;
			}
		}
	}
	return [...hits.values()];
}

export type Replacement = readonly [value: string, marker: string];

/**
 * Longest value first: where an entropy span contains a pattern's shorter match,
 * replacing the short one first leaves the rest of the token visible. Build once
 * per call, then apply to every string.
 */
export function buildReplacements(
	hits: readonly SecretHit[],
	marker: (hit: RedactionMarkerHit) => string,
): Replacement[] {
	return [...hits]
		.sort((a, b) => b.value.length - a.value.length)
		.map((hit) => [hit.value, marker(hit)] as const);
}

export function applyReplacements(input: string, replacements: readonly Replacement[]): string {
	let output = input;
	for (const [value, marker] of replacements) output = replaceLiteral(output, value, marker);
	return output;
}

export function redactString(input: string): string {
	const hits = findRegexSecretHits(input);
	return applyReplacements(input, buildReplacements(hits, createRedactionMarkerFormatter(hits)));
}

export function replaceLiteral(input: string, value: string, replacement: string): string {
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

export function redactValue(
	value: unknown,
	hits = findRegexSecretHits(collectStrings(value).join('\n')),
	marker = createRedactionMarkerFormatter(hits),
): unknown {
	return replaceInValue(value, buildReplacements(hits, marker));
}

export function replaceInValue(value: unknown, replacements: readonly Replacement[]): unknown {
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

export function redactCallToolResult(result: CallToolResult): CallToolResult {
	const hits = findRegexSecretHits(
		[
			...result.content.flatMap((item) =>
				item.type === 'text' && typeof item.text === 'string' ? [item.text] : [],
			),
			...collectStrings(result.structuredContent),
		].join('\n'),
	);
	const replacements = buildReplacements(hits, createRedactionMarkerFormatter(hits));

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
