import type { InstanceAiCredentialPlaceholderDef } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

/**
 * Helpers for Templated Custom Auth (`httpTemplatedCustomAuth`) credentials:
 * the template's `{{marker}}`s are the source of truth for which inputs a
 * simple view renders; placeholder defs only contribute labels and masking.
 */

const TEMPLATE_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

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

/** An n8n expression value (e.g. an external-secrets reference). */
export function isExpressionValue(value: string): boolean {
	return value.startsWith('={{');
}

/** Trim a pasted value and strip a duplicated template prefix. Expressions
 *  (external-secrets references) pass through untouched. */
export function cleanPlaceholderValue(template: unknown, name: string, value: string): string {
	if (isExpressionValue(value)) return value;
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

/**
 * "fal.ai API Key" + user → "fal.ai API Key (Jan D)". Suffixes the creator so
 * same-recipe credentials stay tellable-apart in shared projects.
 */
export function composeCredentialNameWithUser(
	base: string,
	user: { firstName?: string | null; lastName?: string | null } | null | undefined,
): string {
	const first = user?.firstName?.trim();
	if (!first) return base;
	const lastInitial = user?.lastName?.trim().charAt(0) ?? '';
	return `${base} (${first}${lastInitial ? ` ${lastInitial}` : ''})`;
}

/**
 * Human service identity for labels: the recipe's suggested credential name
 * ("fal.ai API Key").
 */
export function deriveServiceName(
	setupHint: { suggestedName?: string } | undefined,
): string | undefined {
	return setupHint?.suggestedName?.trim() || undefined;
}

/** A stored URL only when it parses as http(s) — junk must not reach the
 *  handoff context's strict url() validation. */
export function parseHttpUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return undefined;
	try {
		new URL(value);
		return value;
	} catch {
		return undefined;
	}
}

/** Fallback input label for a marker without a def: `api_key` → "Api key". */
export function humanizeMarkerName(name: string): string {
	const spaced = name.replace(/_/g, ' ').trim();
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * The guided form's input labels, one per template marker — what the user
 * actually pastes into a recipe-created credential.
 */
export function listPlaceholderTitles(credentialData: {
	template?: unknown;
	placeholderDefs?: unknown;
}): string[] {
	const template = parseTemplatedAuthField<unknown>(credentialData.template, {});
	const defsByName = new Map(
		parsePlaceholderDefs(credentialData.placeholderDefs).map((def) => [def.name, def]),
	);
	return extractTemplateMarkers(template).map(
		(marker) => defsByName.get(marker)?.title || humanizeMarkerName(marker),
	);
}
