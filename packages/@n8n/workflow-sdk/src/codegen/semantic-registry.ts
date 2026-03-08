/**
 * Semantic Node Registry
 *
 * Maps n8n node types to semantic output/input names, replacing raw indices
 * with meaningful names that LLMs can understand.
 *
 * Example: Instead of "IF node output 0", we say "trueBranch"
 */

import type { NodeJSON, IDataObject } from '../types/base';

/**
 * Composite types that the codegen can generate
 */
export type CompositeType = 'ifElse' | 'switchCase' | 'merge' | 'splitInBatches';

/**
 * Semantic configuration for a node type
 */
export interface NodeSemantics {
	/** Named outputs - either static array or function that computes from node */
	outputs: string[] | ((node: NodeJSON) => string[]);
	/** Named inputs - either static array or function that computes from node */
	inputs: string[] | ((node: NodeJSON) => string[]);
	/** Which output creates cycles (for SplitInBatches) */
	cycleOutput?: string;
	/** Composite type for code generation */
	composite?: CompositeType;
}

/**
 * Registry of node type semantics
 */
const NODE_SEMANTICS: Record<string, NodeSemantics> = {
	'n8n-nodes-base.if': {
		outputs: ['trueBranch', 'falseBranch'],
		inputs: ['input'],
		composite: 'ifElse',
	},

	'n8n-nodes-base.switch': {
		outputs: (node: NodeJSON): string[] => {
			const params = node.parameters;
			const rules = params?.rules as IDataObject | undefined;
			const rulesArray = rules?.rules as unknown[] | undefined;
			const numCases = rulesArray?.length ?? 4;
			const cases = Array.from({ length: numCases }, (_, i) => `case${i}`);
			return [...cases, 'fallback'];
		},
		inputs: ['input'],
		composite: 'switchCase',
	},

	'n8n-nodes-base.merge': {
		outputs: ['output'],
		inputs: (node: NodeJSON): string[] => {
			const params = node.parameters;
			const numInputs = (params?.numberInputs as number) ?? 2;
			return Array.from({ length: numInputs }, (_, i) => `branch${i}`);
		},
		composite: 'merge',
	},

	'n8n-nodes-base.splitInBatches': {
		outputs: ['done', 'loop'],
		inputs: ['input'],
		cycleOutput: 'loop',
		composite: 'splitInBatches',
	},
};

/**
 * Check if a node has error output enabled (onError: 'continueErrorOutput')
 */
function hasErrorOutput(node: NodeJSON): boolean {
	return node.onError === 'continueErrorOutput';
}

/**
 * Get the error output index for a node.
 * For most nodes with onError: 'continueErrorOutput', the error output is at index 1.
 * Some composite nodes (IF, Switch) may have error at a different index.
 */
function getErrorOutputIndex(type: string, node: NodeJSON): number {
	const semantics = NODE_SEMANTICS[type];
	if (semantics) {
		// For composite nodes, error output is AFTER all regular outputs
		const outputs =
			typeof semantics.outputs === 'function' ? semantics.outputs(node) : semantics.outputs;
		return outputs.length;
	}
	// For regular nodes, error output is at index 1
	return 1;
}

/**
 * Get the semantic name for a node's output at given index
 *
 * @param type - Node type (e.g., 'n8n-nodes-base.if')
 * @param index - Output index
 * @param node - Full node JSON (needed for dynamic outputs like Switch)
 * @returns Semantic name (e.g., 'trueBranch') or generic 'output{index}'
 */
export function getOutputName(type: string, index: number, node: NodeJSON): string {
	// Check for error output first (when node has onError: 'continueErrorOutput')
	if (hasErrorOutput(node)) {
		const errorIndex = getErrorOutputIndex(type, node);
		if (index === errorIndex) {
			return 'error';
		}
	}

	const semantics = NODE_SEMANTICS[type];
	if (!semantics) {
		return `output${index}`;
	}

	const outputs =
		typeof semantics.outputs === 'function' ? semantics.outputs(node) : semantics.outputs;

	if (index < outputs.length) {
		return outputs[index];
	}

	return `output${index}`;
}

/**
 * Get the semantic name for a node's input at given index
 *
 * @param type - Node type (e.g., 'n8n-nodes-base.merge')
 * @param index - Input index
 * @param node - Full node JSON (needed for dynamic inputs like Merge)
 * @returns Semantic name (e.g., 'branch0') or generic 'input{index}'
 */
export function getInputName(type: string, index: number, node: NodeJSON): string {
	const semantics = NODE_SEMANTICS[type];
	if (!semantics) {
		return `input${index}`;
	}

	const inputs = typeof semantics.inputs === 'function' ? semantics.inputs(node) : semantics.inputs;

	if (index < inputs.length) {
		return inputs[index];
	}

	return `input${index}`;
}

/**
 * Get the composite type for a node type
 *
 * @param type - Node type
 * @returns Composite type or undefined for regular nodes
 */
export function getCompositeType(type: string): CompositeType | undefined {
	return NODE_SEMANTICS[type]?.composite;
}

/**
 * Get full semantics for a node type
 *
 * @param type - Node type
 * @param node - Full node JSON (needed for dynamic semantics)
 * @returns Resolved semantics or undefined for unknown types
 */
export function getNodeSemantics(
	type: string,
	node: NodeJSON,
):
	| { outputs: string[]; inputs: string[]; cycleOutput?: string; composite?: CompositeType }
	| undefined {
	const semantics = NODE_SEMANTICS[type];
	if (!semantics) {
		return undefined;
	}

	const outputs =
		typeof semantics.outputs === 'function' ? semantics.outputs(node) : semantics.outputs;
	const inputs = typeof semantics.inputs === 'function' ? semantics.inputs(node) : semantics.inputs;

	return {
		outputs,
		inputs,
		cycleOutput: semantics.cycleOutput,
		composite: semantics.composite,
	};
}

/**
 * Check if a named output is a cycle output (creates back-edges)
 *
 * @param type - Node type
 * @param outputName - Semantic output name
 * @returns true if this output creates cycles
 */
export function isCycleOutput(type: string, outputName: string): boolean {
	const semantics = NODE_SEMANTICS[type];
	return semantics?.cycleOutput === outputName;
}
