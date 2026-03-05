/**
 * Workflow SDK Decompiler
 *
 * Decompiles n8n Workflow-SDK TypeScript code back into the simplified JS DSL.
 * This is the inverse of the transpiler in compiler.ts.
 *
 * Pipeline:
 *   SDK code → parseWorkflowCode → WorkflowJSON
 *   → buildSemanticGraph → annotateGraph → buildCompositeTree
 *   → generateSimplifiedCode → Simplified JS
 */

import type { CompilerError } from './compiler';
import { parseWorkflowCode } from '../codegen/parse-workflow-code';
import { buildSemanticGraph } from '../codegen/semantic-graph';
import { annotateGraph } from '../codegen/graph-annotator';
import { buildCompositeTree } from '../codegen/composite-builder';
import { generateSimplifiedCode } from '../codegen/simplified-generator';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface DecompilerResult {
	code: string;
	errors: CompilerError[];
}

// ─── Main Decompiler ────────────────────────────────────────────────────────

export function decompileWorkflowSDK(sdkCode: string): DecompilerResult {
	try {
		const json = parseWorkflowCode(sdkCode);
		const graph = buildSemanticGraph(json);
		annotateGraph(graph);
		const tree = buildCompositeTree(graph);
		const code = generateSimplifiedCode(tree, json, graph);
		return { code, errors: [] };
	} catch (e) {
		const err = e as { message: string };
		return { code: '', errors: [{ message: err.message, category: 'syntax' }] };
	}
}
