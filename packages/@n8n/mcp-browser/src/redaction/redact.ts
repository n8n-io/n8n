import type { CallToolResult } from '../types';
import { BUILTIN_PATTERNS, type SecretPattern } from './patterns';

export interface SecretHit {
	type: string;
	value: string;
	ref?: string;
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
			if (!hits.has(key)) hits.set(key, { type: slug, value });
		}
	}
	return [...hits.values()];
}

export function redactString(input: string): string {
	let output = input;
	const hits = findRegexSecretHits(input);
	const marker = createRedactionMarkerFormatter(hits);
	for (const hit of hits) {
		output = replaceLiteral(output, hit.value, marker(hit));
	}
	return output;
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
	if (value === null || value === undefined) return value;
	if (typeof value === 'string') {
		let output = value;
		for (const hit of hits) output = replaceLiteral(output, hit.value, marker(hit));
		return output;
	}
	if (Array.isArray(value)) return value.map((entry) => redactValue(entry, hits, marker));
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = redactValue(v, hits, marker);
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
	const marker = createRedactionMarkerFormatter(hits);

	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			for (const hit of hits) item.text = replaceLiteral(item.text, hit.value, marker(hit));
		}
	}
	if (result.structuredContent !== undefined) {
		const redacted = redactValue(result.structuredContent, hits, marker);
		if (isPlainObject(redacted)) result.structuredContent = redacted;
	}
	return result;
}
