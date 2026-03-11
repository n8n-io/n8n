/**
 * Data-Flow Code Format
 *
 * Public API for generating and parsing data-flow style workflow code.
 * This format makes workflows look like plain TypeScript — variables carry data,
 * native control flow replaces IF/Switch nodes, and direct property access
 * replaces n8n expressions.
 *
 * Pipeline (generator):
 * 1. Build Semantic Graph - transform index-based connections to semantic names
 * 2. Annotate Graph - detect cycles and convergence points
 * 3. Build Composite Tree - group nodes into semantic composites
 * 4. Generate Data-Flow Code - emit data-flow code from composite tree
 */

import { generateDataFlowCode } from './dataflow-generator';
import { buildSemanticGraph } from '../semantic-graph';
import { annotateGraph } from '../graph-annotator';
import { buildCompositeTree } from '../composite-builder';
import type { SemanticGraph } from '../types';
import type { WorkflowJSON } from '../../types/base';

/**
 * Options for generateDataFlowWorkflowCode
 */
export interface GenerateDataFlowCodeOptions {
	/** The workflow JSON to convert */
	workflow: WorkflowJSON;
}

/**
 * Type guard to check if input is options object
 */
function isOptionsObject(
	input: WorkflowJSON | GenerateDataFlowCodeOptions,
): input is GenerateDataFlowCodeOptions {
	return 'workflow' in input && input.workflow !== undefined;
}

/**
 * Generate data-flow style code from workflow JSON.
 *
 * @param input - Either WorkflowJSON directly or options object
 * @returns Generated data-flow code as a string
 *
 * @example
 * ```typescript
 * const json = { name: 'My Workflow', nodes: [...], connections: {...} };
 * const code = generateDataFlowWorkflowCode(json);
 * ```
 */
export function generateDataFlowWorkflowCode(
	input: WorkflowJSON | GenerateDataFlowCodeOptions,
): string {
	const workflow = isOptionsObject(input) ? input.workflow : input;

	// Phase 1: Build semantic graph
	const graph = buildSemanticGraph(workflow);

	// Phase 2: Annotate graph with cycle and convergence info
	annotateGraph(graph);

	// Phase 3: Build composite tree
	const tree = buildCompositeTree(graph);

	// Phase 4: Generate data-flow code
	return generateDataFlowCode(tree, workflow, graph);
}

/**
 * Generate data-flow code directly from a SemanticGraph.
 * Skips the JSON intermediary — useful for graph-level round-trips.
 *
 * @param graph - The semantic graph (will be mutated by annotation)
 * @param name - Workflow name
 * @returns Generated data-flow code as a string
 */
export function generateDataFlowFromGraph(graph: SemanticGraph, name: string): string {
	// Phase 1: Annotate graph with cycle and convergence info
	annotateGraph(graph);

	// Phase 2: Build composite tree
	const tree = buildCompositeTree(graph);

	// Phase 3: Generate code (minimal WorkflowJSON for name/pinData only)
	return generateDataFlowCode(tree, { name, nodes: [], connections: {} }, graph);
}

// Re-export expression utilities
export { n8nExprToDataFlow, dataFlowExprToN8n } from './dataflow-expression';

// Re-export the low-level generator for testing
export { generateDataFlowCode } from './dataflow-generator';

// Parser
export { parseDataFlowCode, parseDataFlowCodeToGraph } from './dataflow-parser';
