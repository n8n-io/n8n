import type { INodeTypeDescription, IDisplayOptions } from 'n8n-workflow';

export interface MissingParam {
	path: string;
	displayName: string;
	hint?: string;
}

export interface MissingCredential {
	name: string;
	displayName: string;
}

export interface MissingFields {
	params: MissingParam[];
	credentials: MissingCredential[];
}

/**
 * Compute the set of required parameters and required credentials a node
 * still needs after the agent commits it.
 *
 * POC scope:
 * - Top-level properties only (no recursion into collections/options).
 * - A parameter counts as "missing" when it is marked `required: true`,
 *   currently visible (its `displayOptions.show` predicate matches the
 *   provided parameters), and the supplied value is `undefined`, `null`,
 *   or an empty string.
 * - For credentials, every entry in `description.credentials` whose
 *   `required` flag is `true` is reported. We don't try to resolve a
 *   sensible credential for the user — we just SURFACE the gap.
 */
export function computeMissingFields(
	description: INodeTypeDescription,
	parameters: Record<string, unknown>,
): MissingFields {
	const params: MissingParam[] = [];
	for (const prop of description.properties ?? []) {
		if (!prop.required) continue;
		if (!isPropertyVisible(prop.displayOptions, parameters)) continue;
		const value = parameters[prop.name];
		if (isEmpty(value)) {
			params.push({
				path: prop.name,
				displayName: prop.displayName,
				hint: prop.description ?? prop.hint,
			});
		}
	}

	const credentials: MissingCredential[] = [];
	for (const cred of description.credentials ?? []) {
		if (cred.required) {
			credentials.push({
				name: cred.name,
				displayName: cred.displayName ?? cred.name,
			});
		}
	}

	return { params, credentials };
}

function isEmpty(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === 'string') return value.trim().length === 0;
	return false;
}

/**
 * Best-effort visibility check using only `show`. We don't attempt the full
 * displayOptions algorithm — only enough to filter the most common case
 * (e.g. a Google Sheets param that only shows when operation === 'append').
 * If `show` references a parameter we don't have, the property is reported
 * as missing — that's the cautious, user-facing default.
 */
function isPropertyVisible(
	displayOptions: IDisplayOptions | undefined,
	parameters: Record<string, unknown>,
): boolean {
	if (!displayOptions?.show) return true;
	const show = displayOptions.show as Record<string, unknown[]> | undefined;
	if (!show) return true;
	for (const [key, expected] of Object.entries(show)) {
		const actual = parameters[key];
		if (!Array.isArray(expected)) continue;
		if (!expected.includes(actual)) return false;
	}
	return true;
}

/**
 * Format the missing-fields object as a short, user-friendly chat message.
 * Returns `null` when there's nothing to surface so callers can short-circuit.
 */
export function formatMissingFieldsForChat(
	nodeDisplayName: string,
	missing: MissingFields,
): string | null {
	if (missing.params.length === 0 && missing.credentials.length === 0) return null;
	const lines: string[] = [`Added ${nodeDisplayName}. Before this step can run, please set:`];
	for (const p of missing.params) {
		lines.push(`  • ${p.displayName}`);
	}
	for (const c of missing.credentials) {
		lines.push(`  • Credential: ${c.displayName} (click the credential field on the node)`);
	}
	return lines.join('\n');
}
