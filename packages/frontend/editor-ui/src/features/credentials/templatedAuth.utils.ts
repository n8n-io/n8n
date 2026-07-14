import type { InstanceAiCredentialPlaceholderDef } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

/**
 * Helpers for Templated Custom Auth (`httpTemplatedCustomAuth`) credentials:
 * the template's `{{marker}}`s are the source of truth for which inputs a
 * simple view renders; placeholder defs only contribute labels and masking.
 */

const TEMPLATE_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

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
			for (const match of value.matchAll(TEMPLATE_MARKER_REGEX)) {
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
export function markerPrefix(template: unknown, name: string): string {
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

/** Trim a pasted value and strip a duplicated template prefix. */
export function cleanPlaceholderValue(template: unknown, name: string, value: string): string {
	let cleaned = value.trim();
	const prefix = markerPrefix(template, name);
	if (prefix && cleaned.startsWith(prefix)) cleaned = cleaned.slice(prefix.length).trim();
	return cleaned;
}

export function parsePlaceholderDefs(raw: unknown): InstanceAiCredentialPlaceholderDef[] {
	const parsed = parseTemplatedAuthField<unknown>(raw, []);
	if (!Array.isArray(parsed)) return [];
	return parsed.filter(
		(def): def is InstanceAiCredentialPlaceholderDef =>
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
