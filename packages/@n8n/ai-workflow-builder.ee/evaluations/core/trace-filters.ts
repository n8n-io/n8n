import type { KVMap } from 'langsmith/schemas';

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
		'workflow' in obj
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
 * Large context fields within workflowContext that should be filtered.
 */
const LARGE_CONTEXT_FIELDS = ['executionData', 'executionSchema', 'expressionValues'] as const;

/**
 * Threshold for summarizing workflows instead of including full definition.
 */
const WORKFLOW_SUMMARY_THRESHOLD = 20;

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
 */
export function createTraceFilters(): TraceFilters {
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

		console.log('\n📊 ═══════════════ TRACE FILTERING SUMMARY ═══════════════');
		console.log(
			`   INPUTS:  ${formatBytes(totalInputBefore)} → ${formatBytes(totalInputAfter)} (${inputReduction}% reduction, ${inputCallCount} traces)`,
		);
		console.log(
			`   OUTPUTS: ${formatBytes(totalOutputBefore)} → ${formatBytes(totalOutputAfter)} (${outputReduction}% reduction, ${outputCallCount} traces)`,
		);
		console.log(
			`   TOTAL:   ${formatBytes(totalBefore)} → ${formatBytes(totalAfter)} (${totalReduction}% reduction)`,
		);
		console.log('═══════════════════════════════════════════════════════════\n');
	};

	const filterInputs = (inputs: KVMap): KVMap => {
		// Log once per client to confirm filtering is active
		if (!hasLoggedFilteringActive) {
			hasLoggedFilteringActive = true;
			console.log(
				'➔ LangSmith trace filtering: ACTIVE (set LANGSMITH_MINIMAL_TRACING=false to disable)',
			);
		}

		// Skip LangChain serializable objects - copying them causes size inflation
		if (isLangChainSerializable(inputs)) {
			const size = getApproxSize(inputs);
			inputCallCount++;
			totalInputBefore += size;
			totalInputAfter += size;
			return inputs;
		}

		// Skip if no filterable fields - avoid unnecessary copy overhead
		if (!hasFilterableFields(inputs)) {
			const size = getApproxSize(inputs);
			inputCallCount++;
			totalInputBefore += size;
			totalInputAfter += size;
			return inputs;
		}

		const beforeSize = getApproxSize(inputs);
		const filtered = { ...inputs };

		// Handle large top-level fields
		filterLargeStateFields(filtered);

		// Handle workflowContext if present
		if (filtered.workflowContext && typeof filtered.workflowContext === 'object') {
			const ctx = filtered.workflowContext as Record<string, unknown>;
			const filteredCtx: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(ctx)) {
				if ((LARGE_CONTEXT_FIELDS as readonly string[]).includes(key)) {
					if (key === 'executionData') {
						filteredCtx[key] = '[execution data omitted]';
					} else if (key === 'executionSchema') {
						filteredCtx[key] = `[${Array.isArray(value) ? value.length : 0} schemas]`;
					} else if (key === 'expressionValues') {
						filteredCtx[key] =
							`[${typeof value === 'object' && value ? Object.keys(value).length : 0} expressions]`;
					}
				} else if (key === 'currentWorkflow' && value) {
					// Summarize currentWorkflow
					filteredCtx[key] = summarizeWorkflow(value);
				} else {
					filteredCtx[key] = value;
				}
			}

			filtered.workflowContext = filteredCtx;
		}

		// Handle workflowJSON if present at top level
		if (filtered.workflowJSON && typeof filtered.workflowJSON === 'object') {
			const wf = filtered.workflowJSON as { nodes?: unknown[] };
			if (wf.nodes && wf.nodes.length > WORKFLOW_SUMMARY_THRESHOLD) {
				filtered.workflowJSON = summarizeWorkflow(filtered.workflowJSON);
			}
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
			const wf = filtered.workflow as { nodes?: unknown[] };
			if (wf.nodes && wf.nodes.length > WORKFLOW_SUMMARY_THRESHOLD) {
				filtered.workflow = summarizeWorkflow(filtered.workflow);
			}
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
