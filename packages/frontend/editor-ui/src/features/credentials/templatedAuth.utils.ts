import { isExpression, jsonParse } from 'n8n-workflow';

/**
 * Helpers for Templated Custom Auth (`httpTemplatedCustomAuth`) credentials:
 * the template's `{{marker}}`s are the source of truth for which inputs a
 * simple view renders; placeholder defs only contribute labels and masking.
 *
 * Markers are NOT n8n expressions: they are plain named placeholders that the
 * server substitutes per JSON leaf with stored values, never evaluated (an
 * agent/user-supplied template must not become an eval surface). Expressions
 * only appear as placeholder *values* (e.g. `={{ $secrets.vault.key }}`),
 * where the platform's expression handling applies.
 */

export const TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE = 'httpTemplatedCustomAuth';

/** One entry of the credential's persisted `placeholderDefs` JSON: UI metadata
 *  for a template marker (input label, help text, masking, optional flag). */
export type TemplatedAuthPlaceholderDef = {
	name: string;
	title: string;
	info?: string;
	type?: 'password' | 'plain';
	optional?: boolean;
};

// Must stay in lockstep with PLACEHOLDER_MARKER_REGEX in
// packages/nodes-base/utils/templated-auth.ts — the resolver defines which
// markers get substituted; anything else is left literal, so a looser pattern
// here would render inputs the server never fills.
const PLACEHOLDER_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * Server-side redaction sentinel for placeholder-value JSON leaves (see
 * `credentials.service.ts`). An untouched `***` merges back to the stored
 * secret on save, so it must survive round-trips verbatim.
 */
export const TEMPLATED_AUTH_REDACTED_VALUE = '***';

/** Parse a credential's JSON-string field, tolerating blanks and garbage. */
export function parseTemplatedAuthField<T>(raw: unknown, fallback: T): T {
	if (typeof raw !== 'string' || raw.trim() === '') return fallback;
	return jsonParse<T>(raw, { fallbackValue: fallback });
}

/** All `{{marker}}` names in the template, deduplicated in encounter order. */
export function extractTemplateMarkers(template: unknown): string[] {
	const markers: string[] = [];
	const seen = new Set<string>();
	const collect = (value: unknown): void => {
		if (typeof value === 'string') {
			for (const match of value.matchAll(PLACEHOLDER_MARKER_REGEX)) {
				if (!seen.has(match[1])) {
					seen.add(match[1]);
					markers.push(match[1]);
				}
			}
			return;
		}
		if (Array.isArray(value)) {
			value.forEach(collect);
			return;
		}
		if (typeof value === 'object' && value !== null) {
			Object.values(value).forEach(collect);
		}
	};
	collect(template);
	return markers;
}

/**
 * Static template text directly before a `{{marker}}` in the same string
 * (e.g. `Key ` in `Key {{api_key}}`), used to strip a pasted duplicate of
 * that prefix (some dashboards copy `Key abc…` including the scheme word).
 */
function markerPrefix(template: unknown, name: string): string {
	const marker = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`);
	let prefix = '';
	const visit = (value: unknown): void => {
		if (prefix) return;
		if (typeof value === 'string') {
			const match = marker.exec(value);
			if (match && match.index > 0) prefix = value.slice(0, match.index);
			return;
		}
		if (Array.isArray(value)) {
			value.forEach(visit);
			return;
		}
		if (typeof value === 'object' && value !== null) {
			Object.values(value).forEach(visit);
		}
	};
	visit(template);
	return prefix;
}

/** Trim a pasted value and strip a duplicated template prefix. Expressions
 *  (external-secrets references) pass through untouched. */
export function cleanPlaceholderValue(template: unknown, name: string, value: string): string {
	if (isExpression(value)) return value;
	let cleaned = value.trim();
	const prefix = markerPrefix(template, name);
	if (prefix && cleaned.startsWith(prefix)) cleaned = cleaned.slice(prefix.length).trim();
	return cleaned;
}

export function parsePlaceholderDefs(raw: unknown): TemplatedAuthPlaceholderDef[] {
	const parsed = parseTemplatedAuthField<unknown>(raw, []);
	if (!Array.isArray(parsed)) return [];
	return parsed.filter(
		(def): def is TemplatedAuthPlaceholderDef =>
			typeof def === 'object' &&
			def !== null &&
			typeof (def as { name?: unknown }).name === 'string',
	);
}

export function parsePlaceholderValues(raw: unknown): Record<string, string> {
	const parsed = parseTemplatedAuthField<unknown>(raw, {});
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
	const values: Record<string, string> = {};
	for (const [key, value] of Object.entries(parsed)) {
		if (typeof value === 'string') values[key] = value;
	}
	return values;
}
