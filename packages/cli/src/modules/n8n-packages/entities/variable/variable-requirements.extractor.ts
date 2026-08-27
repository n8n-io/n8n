import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { WorkflowVariableRequirement } from './variable.types';
import type { RequirementsExtractor } from '../requirements-extractor';

/**
 * Matches `$vars.NAME`, `$vars['NAME']`, and `$vars["NAME"]`. Dot notation is
 * identifier-only (JS syntax; mirrors `NEW_VARIABLE_KEY_REGEX` in
 * `@n8n/api-types`). Bracket notation is deliberately wider than the API's
 * historical `[A-Za-z0-9_]+` key contract: runtime `$vars` lookup does no
 * shape validation, so pre-validation-era keys of any shape may exist, and
 * missing one silently drops a dependency while over-matching at worst adds a
 * name-only orphan entry. Quoted keys are taken verbatim; JS string escapes
 * (`\'`, `\\`) are not decoded.
 */
const VARS_REFERENCE_PATTERN =
	/\$vars\s*(?:\.\s*([A-Za-z_][A-Za-z0-9_]*)|\[\s*(?:'([^']+)'|"([^"]+)")\s*\])/g;

@Service()
export class VariableRequirementsExtractor
	implements RequirementsExtractor<WorkflowVariableRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowVariableRequirement[] {
		const names = new Set<string>();

		for (const node of workflow.nodes ?? []) {
			this.scan(node.parameters, names);
		}
		this.scan(workflow.settings, names);

		return [...names].map((variableName) => ({ workflowId: workflow.id, variableName }));
	}

	private scan(value: unknown, names: Set<string>): void {
		if (typeof value === 'string') {
			for (const match of value.matchAll(VARS_REFERENCE_PATTERN)) {
				const name = match[1] ?? match[2] ?? match[3];
				if (name) names.add(name);
			}
			return;
		}

		if (Array.isArray(value)) {
			for (const item of value) this.scan(item, names);
			return;
		}

		if (value !== null && typeof value === 'object') {
			for (const nested of Object.values(value)) this.scan(nested, names);
		}
	}
}
