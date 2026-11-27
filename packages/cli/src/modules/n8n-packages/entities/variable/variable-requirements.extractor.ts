import { Service } from '@n8n/di';
import {
	CODE_LANGCHAIN_NODE_TYPE,
	CODE_TOOL_LANGCHAIN_NODE_TYPE,
	ExpressionParser,
	isExpression,
	NODES_WITH_RENAMABLE_CONTENT,
} from 'n8n-workflow';

import type { WorkflowVariableRequirement } from './variable.types';
import type { RequirementsExtractor } from '../requirements-extractor';

/**
 * Matches `$vars.NAME`, `$vars['NAME']`, `$vars["NAME"]` and `` $vars[`NAME`] ``,
 * each also with optional chaining (`$vars?.NAME`, `$vars?.['NAME']`). Keys that
 * only resolve at runtime (`$vars[key]`, `` $vars[`A_${b}`] ``) are skipped. Dot
 * notation is identifier-only (JS syntax; mirrors `NEW_VARIABLE_KEY_REGEX` in
 * `@n8n/api-types`). Bracket notation is deliberately wider than the API's
 * historical `[A-Za-z0-9_]+` key contract: runtime `$vars` lookup does no
 * shape validation, so pre-validation-era keys of any shape may exist, and
 * missing one silently drops a dependency while over-matching at worst adds a
 * name-only orphan entry. Quoted keys are taken verbatim; JS string escapes
 * (`\'`, `\\`) are not decoded.
 */
const VARS_REFERENCE_PATTERN =
	/\$vars\s*(?:\??\.\s*([A-Za-z_][A-Za-z0-9_]*)|(?:\?\.\s*)?\[\s*(?:'([^']+)'|"([^"]+)"|`((?:[^`$]|\$(?!\{))+)`)\s*\])/g;

/** Nodes that run a fixed (non-expression) parameter value as code, where `$vars` is in scope. */
const CODE_NODE_TYPES = new Set([
	...NODES_WITH_RENAMABLE_CONTENT,
	CODE_TOOL_LANGCHAIN_NODE_TYPE,
	CODE_LANGCHAIN_NODE_TYPE,
]);

/** The parameters of those nodes that hold the source. Their other parameters are plain values. */
const CODE_PARAMETER_NAMES = new Set(['jsCode', 'pythonCode', 'functionCode', 'code']);

/**
 * Describes the workflow fields needed to find variable references.
 * Accepts data from package files without requiring a database WorkflowEntity.
 */
export interface VariableScanSource {
	id: string;
	nodes?: Array<{ type?: string; parameters?: unknown }>;
	settings?: unknown;
}

@Service()
export class VariableRequirementsExtractor
	implements RequirementsExtractor<WorkflowVariableRequirement>
{
	extract(workflow: VariableScanSource): WorkflowVariableRequirement[] {
		return this.extractNames(workflow).map((variableName) => ({
			workflowId: workflow.id,
			variableName,
		}));
	}

	extractNames(source: Omit<VariableScanSource, 'id'>): string[] {
		const names = new Set<string>();

		for (const node of source.nodes ?? []) {
			this.scan(node.parameters, names, node.type);
		}
		this.scan(source.settings, names);

		return [...names];
	}

	private scan(value: unknown, names: Set<string>, nodeType?: string, key?: string): void {
		if (typeof value === 'string') {
			const isSource =
				nodeType !== undefined &&
				key !== undefined &&
				CODE_NODE_TYPES.has(nodeType) &&
				CODE_PARAMETER_NAMES.has(key);
			for (const code of evaluatedParts(value, isSource)) {
				for (const match of code.matchAll(VARS_REFERENCE_PATTERN)) {
					const name = match[1] ?? match[2] ?? match[3] ?? match[4];
					if (name) names.add(name);
				}
			}
			return;
		}

		if (Array.isArray(value)) {
			for (const item of value) this.scan(item, names, nodeType, key);
			return;
		}

		if (value !== null && typeof value === 'object') {
			for (const [nestedKey, nested] of Object.entries(value)) {
				this.scan(nested, names, nodeType, nestedKey);
			}
		}
	}
}

/**
 * Returns the parts of a parameter value that the runtime evaluates: the whole
 * source of a code node, otherwise the `{{ }}` blocks. Fixed values count too,
 * because many nodes resolve `{{ }}` in them without the `=` prefix (SQL
 * queries, HTML and Form templates, LDAP filters). Text outside the blocks is
 * fixed, so a `$vars` mention in it is not a reference.
 */
function evaluatedParts(value: string, isSource: boolean): string[] {
	if (isSource && !isExpression(value)) return [value];
	const template = isExpression(value) ? value.slice(1) : value;
	return ExpressionParser.splitExpression(template)
		.filter((chunk) => chunk.type === 'code')
		.map((chunk) => chunk.text);
}
