/**
 * Codegen Module
 *
 * Generates LLM-friendly SDK code from n8n workflow JSON.
 *
 * Pipeline:
 * 1. Build Semantic Graph - transform index-based connections to semantic names
 * 2. Annotate Graph - detect cycles and convergence points
 * 3. Build Composite Tree - group nodes into semantic composites
 * 4. Generate Code - emit SDK code from composite tree
 */

import type { NodeExecutionSchema, Schema, IRunExecutionData } from 'n8n-workflow';

import { generateCode } from './code-generator';
import { buildCompositeTree } from './composite-builder';
import { buildNodeExecutionStatus, formatExecutionStatusJSDoc } from './execution-status';
import { buildExpressionAnnotations } from './expression-annotator';
import { annotateGraph } from './graph-annotator';
import { buildSemanticGraph } from './semantic-graph';
import type { ExpressionValue } from './types';
import type { WorkflowJSON } from '../types/base';

// Re-export types
export type {
	SemanticGraph,
	SemanticNode,
	SemanticConnection,
	SubnodeConnection,
	ExpressionValue,
} from './types';
export type { CompositeTree, CompositeNode } from './composite-tree';
export type { CompositeType, NodeSemantics } from './semantic-registry';

/**
 * Options for generateWorkflowCode with execution context
 */
export interface GenerateWorkflowCodeOptions {
	/** The workflow JSON to convert */
	workflow: WorkflowJSON;
	/** Node output schemas from previous execution */
	executionSchema?: NodeExecutionSchema[];
	/** Expression values resolved from previous execution */
	expressionValues?: Record<string, ExpressionValue[]>;
	/** Execution result data for status and error info */
	executionData?: IRunExecutionData['resultData'];
	/** Whether execution schema values were excluded (redacted). When true, adds a comment indicating values are redacted. */
	valuesExcluded?: boolean;
	/** Node names whose output schema was derived from pin data rather than real execution output */
	pinnedNodes?: string[];
}

// Re-export individual functions for testing and extension
export { buildSemanticGraph } from './semantic-graph';
export { annotateGraph } from './graph-annotator';
export { buildCompositeTree } from './composite-builder';
export { generateCode } from './code-generator';
export {
	getOutputName,
	getInputName,
	getCompositeType,
	getNodeSemantics,
	isCycleOutput,
} from './semantic-registry';

/**
 * Type guard to check if input is options object
 */
function isOptionsObject(
	input: WorkflowJSON | GenerateWorkflowCodeOptions,
): input is GenerateWorkflowCodeOptions {
	return 'workflow' in input && input.workflow !== undefined;
}

/**
 * Generate LLM-friendly SDK code from workflow JSON
 *
 * @param input - Either WorkflowJSON directly (old API) or options object with execution context (new API)
 * @returns Generated SDK code as a string
 *
 * @example
 * ```typescript
 * // Old API - just WorkflowJSON
 * const json = { name: 'My Workflow', nodes: [...], connections: {...} };
 * const code = generateWorkflowCode(json);
 *
 * // New API - options object with execution context
 * const code = generateWorkflowCode({
 *   workflow: json,
 *   executionSchema: [...],
 *   expressionValues: {...},
 *   executionData: {...}
 * });
 * ```
 */
export function generateWorkflowCode(input: WorkflowJSON | GenerateWorkflowCodeOptions): string {
	// Support both old API (just WorkflowJSON) and new API (options object)
	const {
		workflow,
		executionSchema,
		expressionValues,
		executionData,
		valuesExcluded,
		pinnedNodes,
	} = isOptionsObject(input)
		? input
		: {
				workflow: input,
				executionSchema: undefined,
				expressionValues: undefined,
				executionData: undefined,
				valuesExcluded: undefined,
				pinnedNodes: undefined,
			};

	// Phase 1: Build semantic graph
	const graph = buildSemanticGraph(workflow);

	// Phase 2: Annotate graph with cycle and convergence info
	annotateGraph(graph);

	// Phase 3: Build composite tree
	const tree = buildCompositeTree(graph);

	// Build execution context maps
	const expressionAnnotations = buildExpressionAnnotations(expressionValues);
	const nodeExecutionStatus = buildNodeExecutionStatus(executionData);

	// Build schema map for JSDoc generation
	const nodeSchemas = new Map<string, Schema>();
	if (executionSchema) {
		for (const { nodeName, schema } of executionSchema) {
			nodeSchemas.set(nodeName, schema);
		}
	}

	// Build workflow-level execution status JSDoc
	const workflowStatusJSDoc = formatExecutionStatusJSDoc(executionData);

	// Phase 4: Generate code with execution context
	return generateCode(tree, workflow, graph, {
		expressionAnnotations: expressionAnnotations.size > 0 ? expressionAnnotations : undefined,
		nodeExecutionStatus: nodeExecutionStatus.size > 0 ? nodeExecutionStatus : undefined,
		nodeSchemas: nodeSchemas.size > 0 ? nodeSchemas : undefined,
		workflowStatusJSDoc: workflowStatusJSDoc || undefined,
		valuesExcluded,
		pinnedNodes: pinnedNodes ? new Set(pinnedNodes) : undefined,
	});
}
