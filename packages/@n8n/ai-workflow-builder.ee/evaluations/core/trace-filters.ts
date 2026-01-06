import type { KVMap } from 'langsmith/schemas';

import type { EvalLogger } from '../utils/logger.js';

/**
 * Large state fields that should be filtered from traces.
 * These contribute most to payload bloat.
 */
const LARGE_STATE_FIELDS = ['cachedTemplates', 'parsedNodeTypes', 'messages'] as const;

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
 * Get approximate size of an object in characters (JSON string length).
 * For ASCII content this approximates byte size.
 */
function getApproxSize(obj: unknown): number {
	try {
		return JSON.stringify(obj).length;
	} catch {
		return 0;
	}
}

/**
 * Format bytes to human readable string.
 */
function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

/**
 * Summarize a workflow for minimal trace output.
 * Preserves node counts and names without full definitions.
 */
function summarizeWorkflow(workflow: unknown): Record<string, unknown> {
	if (!workflow || typeof workflow !== 'object') {
		return { unknown: true };
	}

	const wf = workflow as Record<string, unknown>;
	const nodes = wf.nodes as Array<{ name?: string }> | undefined;
	const connections = wf.connections as Record<string, unknown> | undefined;

	return {
		nodeCount: Array.isArray(nodes) ? nodes.length : 0,
		nodeNames: Array.isArray(nodes) ? nodes.map((n) => n.name).filter(Boolean) : [],
		connectionCount: connections ? Object.keys(connections).length : 0,
		name: wf.name,
	};
}

/**
 * Summarize cached templates - just IDs and names, not full workflows.
 */
function summarizeCachedTemplates(templates: unknown[]): Array<Record<string, unknown>> {
	return templates.map((t) => {
		if (!t || typeof t !== 'object') return { unknown: true };
		const template = t as Record<string, unknown>;
		return {
			templateId: template.templateId,
			name: template.name,
		};
	});
}

/**
 * Summarize messages array - just count and types, not full content.
 */
function summarizeMessages(messages: unknown[]): string {
	if (!messages.length) return '[0 messages]';

	// Count message types
	const typeCounts: Record<string, number> = {};
	for (const msg of messages) {
		if (msg && typeof msg === 'object') {
			const msgObj = msg as Record<string, unknown>;
			let type = 'unknown';

			// Try _getType method (LangChain messages)
			if (typeof msgObj._getType === 'function') {
				try {
					type = msgObj._getType();
				} catch {
					// Ignore errors
				}
			}
			// Try type property
			else if (typeof msgObj.type === 'string' && msgObj.type.length < 50) {
				type = msgObj.type;
			}
			// Try constructor name (but validate it's a reasonable string)
			else if (
				msgObj.constructor &&
				typeof msgObj.constructor.name === 'string' &&
				msgObj.constructor.name.length < 50 &&
				msgObj.constructor.name !== 'Object'
			) {
				type = msgObj.constructor.name;
			}

			typeCounts[type] = (typeCounts[type] ?? 0) + 1;
		}
	}

	const parts = Object.entries(typeCounts).map(([type, count]) => `${type}:${count}`);
	return `[${messages.length} messages: ${parts.join(', ')}]`;
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
			} else if (field === 'messages' && Array.isArray(obj[field])) {
				obj[field] = summarizeMessages(obj[field] as unknown[]);
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
	if (!workflow || typeof workflow !== 'object') {
		return workflow;
	}
	const wf = workflow as { nodes?: unknown[] };
	if (wf.nodes && wf.nodes.length > WORKFLOW_SUMMARY_THRESHOLD) {
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
 * Trace filter functions with closure-scoped statistics.
 */
export interface TraceFilters {
	/** Filter function for hideInputs */
	filterInputs: (inputs: KVMap) => KVMap;
	/** Filter function for hideOutputs */
	filterOutputs: (outputs: KVMap) => KVMap;
	/** Log filtering statistics to console */
	logStats: () => void;
	/** Reset statistics (call at start of each evaluation run) */
	resetStats: () => void;
}

/**
 * Creates trace filter functions with closure-scoped state.
 * Each call returns a new set of filters with independent statistics,
 * avoiding global state issues with parallel evaluations.
 * @param logger - Optional logger for output (uses console.log if not provided)
 */
export function createTraceFilters(logger?: EvalLogger): TraceFilters {
	// Closure-scoped state - isolated per client instance
	let hasLoggedFilteringActive = false;
	let totalInputBefore = 0;
	let totalInputAfter = 0;
	let totalOutputBefore = 0;
	let totalOutputAfter = 0;
	let inputCallCount = 0;
	let outputCallCount = 0;

	const resetStats = (): void => {
		hasLoggedFilteringActive = false;
		totalInputBefore = 0;
		totalInputAfter = 0;
		totalOutputBefore = 0;
		totalOutputAfter = 0;
		inputCallCount = 0;
		outputCallCount = 0;
	};

	const logStats = (): void => {
		if (inputCallCount === 0 && outputCallCount === 0) {
			return;
		}

		const inputReduction =
			totalInputBefore > 0 ? ((1 - totalInputAfter / totalInputBefore) * 100).toFixed(1) : '0';
		const outputReduction =
			totalOutputBefore > 0 ? ((1 - totalOutputAfter / totalOutputBefore) * 100).toFixed(1) : '0';
		const totalBefore = totalInputBefore + totalOutputBefore;
		const totalAfter = totalInputAfter + totalOutputAfter;
		const totalReduction =
			totalBefore > 0 ? ((1 - totalAfter / totalBefore) * 100).toFixed(1) : '0';

		const log = logger?.info ?? console.log;
		log('\n📊 ═══════════════ TRACE FILTERING SUMMARY ═══════════════');
		log(
			`   INPUTS:  ${formatBytes(totalInputBefore)} → ${formatBytes(totalInputAfter)} (${inputReduction}% reduction, ${inputCallCount} traces)`,
		);
		log(
			`   OUTPUTS: ${formatBytes(totalOutputBefore)} → ${formatBytes(totalOutputAfter)} (${outputReduction}% reduction, ${outputCallCount} traces)`,
		);
		log(
			`   TOTAL:   ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${totalReduction}% reduction)`,
		);
		log('═══════════════════════════════════════════════════════════\n');
	};

	/** Track input stats and return the object unchanged */
	const trackInputPassthrough = (inputs: KVMap): KVMap => {
		const size = getApproxSize(inputs);
		inputCallCount++;
		totalInputBefore += size;
		totalInputAfter += size;
		return inputs;
	};

	const filterInputs = (inputs: KVMap): KVMap => {
		// Log once per client to confirm filtering is active
		if (!hasLoggedFilteringActive) {
			hasLoggedFilteringActive = true;
			const log = logger?.info ?? console.log;
			log('➔ LangSmith trace filtering: ACTIVE (set LANGSMITH_MINIMAL_TRACING=false to disable)');
		}

		// Skip LangChain serializable objects - copying them causes size inflation
		if (isLangChainSerializable(inputs)) {
			return trackInputPassthrough(inputs);
		}

		// Skip if no filterable fields - avoid unnecessary copy overhead
		if (!hasFilterableFields(inputs)) {
			return trackInputPassthrough(inputs);
		}

		const beforeSize = getApproxSize(inputs);
		const filtered = { ...inputs };

		// Handle large top-level fields
		filterLargeStateFields(filtered);

		// Handle workflowContext if present
		if (filtered.workflowContext && typeof filtered.workflowContext === 'object') {
			filtered.workflowContext = filterWorkflowContext(
				filtered.workflowContext as Record<string, unknown>,
			);
		}

		// Handle workflowJSON if present at top level
		if (filtered.workflowJSON && typeof filtered.workflowJSON === 'object') {
			filtered.workflowJSON = summarizeLargeWorkflow(filtered.workflowJSON);
		}

		// Handle large 'input' field (LangChain model inputs with system prompts)
		if (filtered.input && typeof filtered.input === 'string' && filtered.input.length > 1000) {
			filtered.input = `[input truncated: ${filtered.input.length} chars]`;
		}

		// Track stats for final summary
		const afterSize = getApproxSize(filtered);
		inputCallCount++;
		totalInputBefore += beforeSize;
		totalInputAfter += afterSize;

		return filtered;
	};

	const filterOutputs = (outputs: KVMap): KVMap => {
		// Skip LangChain serializable objects - copying them causes size inflation
		if (isLangChainSerializable(outputs)) {
			const size = getApproxSize(outputs);
			outputCallCount++;
			totalOutputBefore += size;
			totalOutputAfter += size;
			return outputs;
		}

		const beforeSize = getApproxSize(outputs);
		outputCallCount++;

		// Check if there are any filterable fields in outputs
		const hasFilterableOutputFields =
			'workflow' in outputs || LARGE_STATE_FIELDS.some((field) => field in outputs);

		// Skip if no filterable fields
		if (!hasFilterableOutputFields) {
			totalOutputBefore += beforeSize;
			totalOutputAfter += beforeSize;
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

		// Track stats for final summary
		const afterSize = getApproxSize(filtered);
		totalOutputBefore += beforeSize;
		totalOutputAfter += afterSize;

		return filtered;
	};

	return { filterInputs, filterOutputs, logStats, resetStats };
}
