import type { KVMap } from 'langsmith/schemas';

import { isSimpleWorkflow } from './types';
import type { EvalLogger } from '../harness/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type guard: check if value is a non-null object (Record).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Large state fields that should be filtered from traces.
 * These contribute most to payload bloat.
 */
const LARGE_STATE_FIELDS = ['cachedTemplates', 'parsedNodeTypes'] as const;

/**
 * Keys that indicate a LangChain serializable object.
 * These should be passed through unchanged - copying them causes size inflation.
 */
const LANGCHAIN_SERIALIZABLE_KEYS = ['lc_serializable', 'lc_kwargs', 'lc_namespace'] as const;

/**
 * Large context fields within workflowContext that should be filtered.
 */
const LARGE_CONTEXT_FIELDS = ['executionData', 'executionSchema', 'expressionValues'] as const;

/**
 * Threshold for summarizing workflows instead of including full definition.
 */
const WORKFLOW_SUMMARY_THRESHOLD = 20;

/**
 * Check if an object is a LangChain serializable object.
 * These objects should not be filtered as copying them causes size inflation.
 */
function isLangChainSerializable(obj: KVMap): boolean {
	return LANGCHAIN_SERIALIZABLE_KEYS.some((key) => key in obj);
}

/**
 * Check if an object has any fields worth filtering.
 */
function hasFilterableFields(obj: KVMap): boolean {
	return (
		LARGE_STATE_FIELDS.some((field) => field in obj) ||
		'workflowContext' in obj ||
		'workflowJSON' in obj ||
		'workflow' in obj ||
		'input' in obj // LangChain model inputs can be large
	);
}

/**
 * Summarize a workflow for minimal trace output.
 * Preserves node counts and names without full definitions.
 */
function summarizeWorkflow(workflow: unknown): Record<string, unknown> {
	if (!isSimpleWorkflow(workflow)) {
		return { unknown: true };
	}

	return {
		nodeCount: workflow.nodes.length,
		nodeNames: workflow.nodes.map((n) => n.name).filter(Boolean),
		connectionCount: Object.keys(workflow.connections).length,
		name: workflow.name,
	};
}

/**
 * Summarize cached templates - just IDs and names, not full workflows.
 */
function summarizeCachedTemplates(templates: unknown[]): Array<Record<string, unknown>> {
	return templates.map((t) => {
		if (!isRecord(t)) return { unknown: true };
		return {
			templateId: t.templateId,
			name: t.name,
		};
	});
}

/**
 * Filter large state fields in-place (mutates the object).
 * Shared logic for both input and output filtering.
 */
function filterLargeStateFields(obj: KVMap): void {
	for (const field of LARGE_STATE_FIELDS) {
		if (field in obj) {
			if (field === 'cachedTemplates' && Array.isArray(obj[field])) {
				obj[field] = summarizeCachedTemplates(obj[field] as unknown[]);
			} else if (field === 'parsedNodeTypes' && Array.isArray(obj[field])) {
				obj[field] = `[${(obj[field] as unknown[]).length} node types]`;
			}
		}
	}
}

/**
 * Summarize a large context field to a placeholder string.
 */
function summarizeContextField(key: string, value: unknown): string {
	switch (key) {
		case 'executionData':
			return '[execution data omitted]';
		case 'executionSchema':
			return `[${Array.isArray(value) ? value.length : 0} schemas]`;
		case 'expressionValues':
			return `[${typeof value === 'object' && value ? Object.keys(value).length : 0} expressions]`;
		default:
			return '[omitted]';
	}
}

/**
 * Filter workflowContext object, summarizing large fields.
 */
function filterWorkflowContext(ctx: Record<string, unknown>): Record<string, unknown> {
	const filtered: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(ctx)) {
		if ((LARGE_CONTEXT_FIELDS as readonly string[]).includes(key)) {
			filtered[key] = summarizeContextField(key, value);
		} else if (key === 'currentWorkflow' && value) {
			filtered[key] = summarizeWorkflow(value);
		} else {
			filtered[key] = value;
		}
	}

	return filtered;
}

/**
 * Summarize a workflow field if it exceeds the node threshold.
 */
function summarizeLargeWorkflow(workflow: unknown): unknown {
	if (!isSimpleWorkflow(workflow)) {
		return workflow;
	}
	if (workflow.nodes.length > WORKFLOW_SUMMARY_THRESHOLD) {
		return summarizeWorkflow(workflow);
	}
	return workflow;
}

/**
 * Check if minimal tracing is enabled.
 * Default: true (enabled by default for evaluations)
 * Set LANGSMITH_MINIMAL_TRACING=false to disable.
 */
export function isMinimalTracingEnabled(): boolean {
	const envValue = process.env.LANGSMITH_MINIMAL_TRACING;
	// Default to true if not set, only disable if explicitly set to 'false'
	return envValue !== 'false';
}

/**
 * Trace filter functions used by LangSmith client configuration.
 */
export interface TraceFilters {
	/** Filter function for hideInputs */
	filterInputs: (inputs: KVMap) => KVMap;
	/** Filter function for hideOutputs */
	filterOutputs: (outputs: KVMap) => KVMap;
}

/**
 * Creates trace filter functions.
 * @param logger - Optional logger for output (uses console.log if not provided)
 */
export function createTraceFilters(logger?: EvalLogger): TraceFilters {
	let hasLoggedFilteringActive = false;

	const filterInputs = (inputs: KVMap): KVMap => {
		// Log once per client to confirm filtering is active
		if (!hasLoggedFilteringActive) {
			hasLoggedFilteringActive = true;
			const log = logger?.info ?? console.log;
			log('➔ LangSmith trace filtering: ACTIVE (set LANGSMITH_MINIMAL_TRACING=false to disable)');
		}

		// Skip LangChain serializable objects - copying them causes size inflation
		if (isLangChainSerializable(inputs)) {
			return inputs;
		}

		// Skip if no filterable fields - avoid unnecessary copy overhead
		if (!hasFilterableFields(inputs)) {
			return inputs;
		}

		const filtered = { ...inputs };

		// Handle large top-level fields
		filterLargeStateFields(filtered);

		// Handle workflowContext if present
		if (isRecord(filtered.workflowContext)) {
			filtered.workflowContext = filterWorkflowContext(filtered.workflowContext);
		}

		// Handle workflowJSON if present at top level
		if (filtered.workflowJSON && typeof filtered.workflowJSON === 'object') {
			filtered.workflowJSON = summarizeLargeWorkflow(filtered.workflowJSON);
		}

		// Handle large 'input' field (LangChain model inputs with system prompts)
		if (filtered.input && typeof filtered.input === 'string' && filtered.input.length > 1000) {
			filtered.input = `[input truncated: ${filtered.input.length} chars]`;
		}

		return filtered;
	};

	const filterOutputs = (outputs: KVMap): KVMap => {
		// Skip LangChain serializable objects - copying them causes size inflation
		if (isLangChainSerializable(outputs)) {
			return outputs;
		}

		// Check if there are any filterable fields in outputs
		const hasFilterableOutputFields =
			'workflow' in outputs || LARGE_STATE_FIELDS.some((field) => field in outputs);

		// Skip if no filterable fields
		if (!hasFilterableOutputFields) {
			return outputs;
		}

		const filtered = { ...outputs };

		// Handle large state fields in outputs
		filterLargeStateFields(filtered);

		// Summarize workflow outputs if present and large
		if (filtered.workflow && typeof filtered.workflow === 'object') {
			filtered.workflow = summarizeLargeWorkflow(filtered.workflow);
		}

		// Keep feedback array as-is - it's essential for evaluation results

		return filtered;
	};

	return { filterInputs, filterOutputs };
}
