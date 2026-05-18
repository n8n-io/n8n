import type { CallToolResult } from '../types';
import { BUILTIN_PATTERNS, type SecretPattern } from './patterns';

export interface SecretHit {
	type: string;
	value: string;
	ref?: string;
}

const GLOBAL_PATTERNS: ReadonlyArray<{ slug: string; regex: RegExp }> = BUILTIN_PATTERNS.map(
	(p: SecretPattern) => ({
		slug: p.slug,
		regex: new RegExp(
			p.pattern.source,
			p.pattern.flags.includes('g') ? p.pattern.flags : `${p.pattern.flags}g`,
		),
	}),
);

export function formatRedactionMarker(hit: Pick<SecretHit, 'type' | 'ref'>): string {
	return `[REDACTED:${hit.type}]${hit.ref ? `@${hit.ref}` : ''}`;
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
	for (const hit of findRegexSecretHits(input)) {
		output = replaceLiteral(output, hit.value, formatRedactionMarker(hit));
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

export function redactValue(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === 'string') return redactString(value);
	if (Array.isArray(value)) return value.map((entry) => redactValue(entry));
	if (isPlainObject(value)) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = redactValue(v);
		}
		return out;
	}
	return value;
}

export function redactCallToolResult(result: CallToolResult): CallToolResult {
	for (const item of result.content) {
		if (item.type === 'text' && typeof item.text === 'string') {
			item.text = redactString(item.text);
		}
	}
	if (result.structuredContent !== undefined) {
		const redacted = redactValue(result.structuredContent);
		if (isPlainObject(redacted)) result.structuredContent = redacted;
	}
	return result;
}
