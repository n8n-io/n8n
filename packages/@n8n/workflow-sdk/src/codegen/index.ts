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

import type { WorkflowJSON } from '../types/base';
import { buildSemanticGraph } from './semantic-graph';
import { annotateGraph } from './graph-annotator';
import { buildCompositeTree } from './composite-builder';
import { generateCode } from './code-generator';

// Re-export types
export type { SemanticGraph, SemanticNode, SemanticConnection, SubnodeConnection } from './types';
export type { CompositeTree, CompositeNode } from './composite-tree';
export type { CompositeType, NodeSemantics } from './semantic-registry';

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
 * Generate LLM-friendly SDK code from workflow JSON
 *
 * @param json - The workflow JSON to convert
 * @returns Generated SDK code as a string
 *
 * @example
 * ```typescript
 * const json = { name: 'My Workflow', nodes: [...], connections: {...} };
 * const code = generateWorkflowCode(json);
 * // Returns:
 * // workflow('id', 'My Workflow')
 * //   .add(trigger({...}))
 * //   .then(node({...}))
 * //   .toJSON();
 * ```
 */
export function generateWorkflowCode(json: WorkflowJSON): string {
	// Phase 1: Build semantic graph
	const graph = buildSemanticGraph(json);

	// Phase 2: Annotate graph with cycle and convergence info
	annotateGraph(graph);

	// Phase 3: Build composite tree
	const tree = buildCompositeTree(graph);

	// Phase 4: Generate code
	return generateCode(tree, json);
}
