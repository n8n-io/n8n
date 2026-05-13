import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';

import type { ParsedWorkflow } from './parse';

// Matches `$env.<identifier>` and `$env['<identifier>']` / `$env["<identifier>"]`
// inside any string. The bracket form is rarely used in practice but it's a
// valid n8n expression syntax, so we detect it too. Group 1 captures the dot
// form's identifier; group 2 captures the bracket form's identifier — exactly
// one of the two groups is populated per match.
const ENV_REF_REGEX = /\$env\.([A-Za-z_][A-Za-z0-9_]*)|\$env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g;

interface UnresolvedRef {
	envName: string;
	workflowName: string;
	nodeName: string;
}

function collectEnvRefsFromString(value: string): string[] {
	const matches: string[] = [];
	// `matchAll` returns a fresh iterator each call, so the global regex's
	// `lastIndex` state cannot leak between calls.
	for (const match of value.matchAll(ENV_REF_REGEX)) {
		const name = match[1] ?? match[2];
		if (name !== undefined) matches.push(name);
	}
	return matches;
}

function collectEnvRefsFromValue(value: unknown, accumulator: string[]): void {
	if (typeof value === 'string') {
		accumulator.push(...collectEnvRefsFromString(value));
		return;
	}

	if (Array.isArray(value)) {
		for (const entry of value) collectEnvRefsFromValue(entry, accumulator);
		return;
	}

	if (typeof value === 'object' && value !== null) {
		for (const entry of Object.values(value)) collectEnvRefsFromValue(entry, accumulator);
	}
}

/**
 * Walks each workflow's nodes, extracts every `$env.X` reference from string
 * parameter values, and emits one warning per reference where `process.env[X]`
 * is undefined.
 *
 * Intentionally does NOT de-duplicate: if the same env var is referenced from
 * three nodes, three warnings are emitted, each naming its node — that
 * specificity is the point. Activation must proceed regardless; this is a
 * developer hint, not a blocker.
 */
export function warnOnMissingEnvRefs(workflows: ParsedWorkflow[]): void {
	const logger = Container.get(Logger);
	const unresolved: UnresolvedRef[] = [];

	for (const workflow of workflows) {
		for (const node of workflow.nodes) {
			if (node.parameters === undefined || node.parameters === null) continue;
			const refs: string[] = [];
			collectEnvRefsFromValue(node.parameters, refs);
			for (const envName of refs) {
				if (process.env[envName] === undefined) {
					unresolved.push({
						envName,
						workflowName: workflow.name,
						nodeName: node.name,
					});
				}
			}
		}
	}

	for (const ref of unresolved) {
		logger.warn(
			`$env.${ref.envName} referenced in node "${ref.nodeName}" of workflow "${ref.workflowName}" — not set`,
		);
	}
}
