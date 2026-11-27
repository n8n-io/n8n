import type { CredentialTypeInfo, CredentialTypeProperty } from './runtime-credentials.catalog';
import type { RuntimeCredentialTransform } from './runtime-credentials.api';
import { FILLABLE_FIELD_TYPES, PROTECTED_FIELD_NAMES } from './runtime-credentials.presets';

export type TransformKind = 'none' | 'bearer' | 'field';

export function parseTransform(transform?: RuntimeCredentialTransform): {
	kind: TransformKind;
	fieldName: string;
} {
	if (transform === 'bearer') return { kind: 'bearer', fieldName: '' };
	if (transform?.startsWith('field:')) {
		return { kind: 'field', fieldName: transform.slice('field:'.length) };
	}
	return { kind: 'none', fieldName: '' };
}

export function buildTransform(
	kind: TransformKind,
	fieldName: string,
): RuntimeCredentialTransform | undefined {
	if (kind === 'bearer') return 'bearer';
	if (kind === 'field') return `field:${fieldName.trim()}`;
	return undefined;
}

export function getHttpStatus(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'httpStatusCode' in error) {
		const status = error.httpStatusCode;
		return typeof status === 'number' ? status : undefined;
	}
	return undefined;
}

const INVALID_HOST_CHARACTERS = /[/:@\\\s]/;

/** Splits a comma separated host list. Drops empty entries. */
export function parseAllowedDomains(value: string | null | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

/** Returns the first entry that is not a bare host, or `undefined` when all entries are valid. */
export function findInvalidAllowedDomain(value: string): string | undefined {
	return parseAllowedDomains(value).find((entry) => INVALID_HOST_CHARACTERS.test(entry));
}

/** Empty string means no restriction. */
export function normalizeAllowedDomains(value: string): string {
	return parseAllowedDomains(value).join(', ');
}

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export type PathProblem = 'empty' | 'emptySegment' | 'unsafe';

/** Mirrors the checks the backend makes on a path, so the wizard can explain a problem early. */
export function findPathProblem(path: string): PathProblem | undefined {
	const trimmed = path.trim();
	if (trimmed === '') return 'empty';
	const segments = trimmed.split('.');
	if (segments.some((segment) => segment === '')) return 'emptySegment';
	if (segments.some((segment) => UNSAFE_PATH_SEGMENTS.has(segment.replace(/\[\*\]$/, '')))) {
		return 'unsafe';
	}
	return undefined;
}

export function splitPath(path: string): string[] {
	return path.split('.').filter((segment) => segment !== '');
}

export type PathPresetKind = 'authorization' | 'header' | 'body' | 'query' | 'custom';

/** Finds the preset that produces a path, and the name it carries. */
export function detectPathPreset(path: string): { preset: PathPresetKind; name: string } {
	const trimmed = path.trim();
	if (trimmed === 'headers.authorization') return { preset: 'authorization', name: '' };
	for (const [prefix, preset] of [
		['headers.', 'header'],
		['body.', 'body'],
		['query.', 'query'],
	] as const) {
		if (trimmed.startsWith(prefix) && trimmed.length > prefix.length) {
			return { preset, name: trimmed.slice(prefix.length) };
		}
	}
	return { preset: 'custom', name: '' };
}

export function buildPresetPath(preset: PathPresetKind, name: string): string {
	const trimmed = name.trim();
	switch (preset) {
		case 'authorization':
			return 'headers.authorization';
		case 'header':
			return trimmed === '' ? '' : `headers.${trimmed.toLowerCase()}`;
		case 'body':
			return trimmed === '' ? '' : `body.${trimmed}`;
		case 'query':
			return trimmed === '' ? '' : `query.${trimmed}`;
		case 'custom':
			return '';
	}
}

export type SampleLinePart = { text: string; mark?: boolean };
export type SampleLine = SampleLinePart[];

const SAMPLE_SECRET = '<secret>';

function headerCase(name: string): string {
	return name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('-');
}

function jsonLines(segments: string[]): SampleLine[] {
	const lines: SampleLine[] = [[{ text: '{' }]];
	segments.forEach((segment, index) => {
		const indent = '  '.repeat(index + 1);
		const isLast = index === segments.length - 1;
		lines.push(
			isLast
				? [{ text: `${indent}"${segment}": "${SAMPLE_SECRET}"`, mark: true }]
				: [{ text: `${indent}"${segment}": {` }],
		);
	});
	for (let index = segments.length - 2; index >= 0; index--) {
		lines.push([{ text: `${'  '.repeat(index + 1)}}` }]);
	}
	lines.push([{ text: '}' }]);
	return lines;
}

/**
 * Builds a small example of the request that carries the value, with the part that the path reads
 * marked. A path outside headers, query, and body shows the trigger data instead.
 */
export function buildSampleRequest(path: string): SampleLine[] {
	const segments = splitPath(path.trim());
	const [root, ...rest] = segments;
	const target = '/webhook/your-path';

	if (root === 'headers' && rest.length === 1) {
		const name = rest[0];
		const value = name === 'authorization' ? `Bearer ${SAMPLE_SECRET}` : SAMPLE_SECRET;
		return [
			[{ text: `POST ${target} HTTP/1.1` }],
			[{ text: `${headerCase(name)}: ${value}`, mark: true }],
			[{ text: 'Content-Type: application/json' }],
		];
	}

	if (root === 'query' && rest.length === 1) {
		return [
			[
				{ text: `POST ${target}?` },
				{ text: `${rest[0]}=${SAMPLE_SECRET}`, mark: true },
				{ text: ' HTTP/1.1' },
			],
			[{ text: 'Content-Type: application/json' }],
		];
	}

	if (root === 'body' && rest.length > 0) {
		return [
			[{ text: `POST ${target} HTTP/1.1` }],
			[{ text: 'Content-Type: application/json' }],
			[{ text: '' }],
			...jsonLines(rest),
		];
	}

	return segments.length > 0 ? jsonLines(segments) : [];
}

/** True when the credential type is, or extends, the base OAuth2 type. */
export function isOAuth2Type(
	name: string,
	catalog: ReadonlyMap<string, CredentialTypeInfo>,
): boolean {
	const seen = new Set<string>();
	const queue = [name];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		if (current === 'oAuth2Api') return true;
		if (seen.has(current)) continue;
		seen.add(current);
		queue.push(...(catalog.get(current)?.extends ?? []));
	}
	return false;
}

/** Properties of the type and its parents. A property of the type wins over a parent property. */
export function getCredentialProperties(
	name: string,
	catalog: ReadonlyMap<string, CredentialTypeInfo>,
): CredentialTypeProperty[] {
	const properties = new Map<string, CredentialTypeProperty>();
	const seen = new Set<string>();
	const queue = [name];
	while (queue.length > 0) {
		const current = queue.shift() as string;
		if (seen.has(current)) continue;
		seen.add(current);
		const info = catalog.get(current);
		if (!info) continue;
		for (const property of info.properties) {
			if (!properties.has(property.name)) properties.set(property.name, property);
		}
		queue.push(...(info.extends ?? []));
	}
	return [...properties.values()];
}

/** Fields that can receive a request value: no hidden, pinned, or non-text fields. */
export function getFillableFields(
	name: string,
	catalog: ReadonlyMap<string, CredentialTypeInfo>,
): CredentialTypeProperty[] {
	return getCredentialProperties(name, catalog).filter(
		(property) =>
			FILLABLE_FIELD_TYPES.has(property.type) && !PROTECTED_FIELD_NAMES.has(property.name),
	);
}

export type RuleIssue =
	| { kind: 'unknownType'; type: string }
	| { kind: 'unknownField'; type: string; field: string }
	| { kind: 'controlledField'; type: string; field: string };

/**
 * Finds a reason the backend would not fill the rule's credential. Returns `undefined` when the
 * rule looks fine, or when the type list is not loaded and nothing can be checked. The rule list
 * API carries no status, so this follows the backend checks that the browser can repeat.
 */
export function findRuleIssue(
	rule: { credentialType: string; transform?: RuntimeCredentialTransform },
	catalog: ReadonlyMap<string, CredentialTypeInfo>,
): RuleIssue | undefined {
	if (catalog.size === 0) return undefined;
	if (!catalog.has(rule.credentialType)) {
		return { kind: 'unknownType', type: rule.credentialType };
	}
	const { kind, fieldName } = parseTransform(rule.transform);
	if (kind !== 'field') return undefined;
	const properties = getCredentialProperties(rule.credentialType, catalog);
	const property = properties.find(({ name }) => name === fieldName);
	if (!property) return { kind: 'unknownField', type: rule.credentialType, field: fieldName };
	if (property.type === 'hidden' || PROTECTED_FIELD_NAMES.has(fieldName)) {
		return { kind: 'controlledField', type: rule.credentialType, field: fieldName };
	}
	return undefined;
}

/** Turns text into a lowercase alias with hyphens. */
export function toAlias(text: string): string {
	return text
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase()
		.slice(0, 128);
}

/** Returns `base`, or `base-2`, `base-3` and so on when the alias is taken. */
export function uniqueAlias(base: string, taken: Iterable<string>): string {
	const used = new Set(taken);
	const root = toAlias(base) || 'rule';
	if (!used.has(root)) return root;
	for (let count = 2; ; count++) {
		const candidate = `${root}-${count}`;
		if (!used.has(candidate)) return candidate;
	}
}

export type WizardStepId = 'source' | 'credential' | 'endpoints';

/** The step that an error from the server relates to. */
export function stepForServerReason(reason: string): WizardStepId | undefined {
	if (/credential type|field "|controlled by n8n|transform/i.test(reason)) return 'credential';
	if (/path|segment/i.test(reason)) return 'source';
	if (/host|domain|"\*\."|space|empty entry/i.test(reason)) return 'endpoints';
	return undefined;
}
