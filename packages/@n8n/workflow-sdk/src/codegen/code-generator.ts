/**
 * Code Generator
 *
 * Generates LLM-friendly SDK code from a composite tree.
 */

import type { WorkflowJSON, IDataObject } from '../types/base';
import type { SemanticNode } from './types';
import type {
	CompositeTree,
	CompositeNode,
	LeafNode,
	ChainNode,
	VariableReference,
	IfBranchCompositeNode,
	SwitchCaseCompositeNode,
	MergeCompositeNode,
	SplitInBatchesCompositeNode,
} from './composite-tree';

/**
 * Context for code generation
 */
interface GenerationContext {
	indent: number;
	generatedVars: Set<string>;
}

/**
 * Get indentation string
 */
function getIndent(ctx: GenerationContext): string {
	return '  '.repeat(ctx.indent);
}

/**
 * Format a value for code output
 */
function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return `'${value.replace(/'/g, "\\'")}'`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		return `[${value.map(formatValue).join(', ')}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		return `{ ${entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ')} }`;
	}
	return String(value);
}

/**
 * Check if node is a trigger type
 */
function isTriggerType(type: string): boolean {
	return type.toLowerCase().includes('trigger') || type === 'n8n-nodes-base.webhook';
}

/**
 * Generate node config object
 */
function generateNodeConfig(node: SemanticNode, ctx: GenerationContext): string {
	const indent = getIndent(ctx);
	const innerIndent = getIndent({ ...ctx, indent: ctx.indent + 1 });

	const parts: string[] = [];

	parts.push(`${innerIndent}type: '${node.type}'`);
	parts.push(`${innerIndent}version: ${node.json.typeVersion}`);

	const configParts: string[] = [];

	if (node.json.name && node.json.name !== 'Node') {
		configParts.push(`name: '${node.json.name}'`);
	}

	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(node.json.parameters)}`);
	}

	if (node.json.credentials) {
		configParts.push(`credentials: ${formatValue(node.json.credentials)}`);
	}

	if (configParts.length > 0) {
		parts.push(`${innerIndent}config: { ${configParts.join(', ')} }`);
	}

	return `{\n${parts.join(',\n')}\n${indent}}`;
}

/**
 * Generate node call
 */
function generateNodeCall(node: SemanticNode, ctx: GenerationContext): string {
	const config = generateNodeConfig(node, ctx);

	if (isTriggerType(node.type)) {
		return `trigger(${config})`;
	} else {
		return `node(${config})`;
	}
}

/**
 * Generate code for a leaf node
 */
function generateLeaf(leaf: LeafNode, ctx: GenerationContext): string {
	return generateNodeCall(leaf.node, ctx);
}

/**
 * Generate code for a chain
 */
function generateChain(chain: ChainNode, ctx: GenerationContext): string {
	const parts: string[] = [];

	for (let i = 0; i < chain.nodes.length; i++) {
		const node = chain.nodes[i];
		const nodeCode = generateComposite(node, ctx);

		if (i === 0) {
			parts.push(nodeCode);
		} else {
			parts.push(`.then(${nodeCode})`);
		}
	}

	return parts.join('\n' + getIndent(ctx));
}

/**
 * Generate code for a variable reference
 */
function generateVarRef(varRef: VariableReference, _ctx: GenerationContext): string {
	return varRef.varName;
}

/**
 * Generate code for an IF branch
 */
function generateIfBranch(ifBranch: IfBranchCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	const trueBranchCode = ifBranch.trueBranch
		? generateComposite(ifBranch.trueBranch, innerCtx)
		: 'null';

	const falseBranchCode = ifBranch.falseBranch
		? generateComposite(ifBranch.falseBranch, innerCtx)
		: 'null';

	const config = generateNodeConfig(ifBranch.ifNode, ctx);

	return `ifBranch([${trueBranchCode}, ${falseBranchCode}], ${config})`;
}

/**
 * Generate code for a switch case
 */
function generateSwitchCase(switchCase: SwitchCaseCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	const casesCode = switchCase.cases
		.map((c) => (c ? generateComposite(c, innerCtx) : 'null'))
		.join(', ');

	const config = generateNodeConfig(switchCase.switchNode, ctx);

	return `switchCase([${casesCode}], ${config})`;
}

/**
 * Generate code for a merge
 */
function generateMerge(merge: MergeCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	const branchesCode = merge.branches.map((b) => generateComposite(b, innerCtx)).join(', ');

	const config = generateNodeConfig(merge.mergeNode, ctx);

	return `merge([${branchesCode}], ${config})`;
}

/**
 * Generate code for split in batches
 */
function generateSplitInBatches(sib: SplitInBatchesCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };
	const config = generateNodeConfig(sib.sibNode, ctx);

	let code = `splitInBatches(${config})`;

	if (sib.doneChain) {
		const doneCode = generateComposite(sib.doneChain, innerCtx);
		code += `\n${getIndent(ctx)}.done().then(${doneCode})`;
	}

	if (sib.loopChain) {
		const loopCode = generateComposite(sib.loopChain, innerCtx);
		code += `\n${getIndent(ctx)}.each().then(${loopCode})`;

		// Check if loop chain ends with cycle back
		if (sib.loopChain.kind === 'chain') {
			const lastNode = sib.loopChain.nodes[sib.loopChain.nodes.length - 1];
			if (lastNode && lastNode.kind === 'varRef') {
				code += `.loop()`;
			}
		} else if (sib.loopChain.kind === 'varRef') {
			code += `.loop()`;
		}
	}

	return code;
}

/**
 * Generate code for any composite node
 */
function generateComposite(node: CompositeNode, ctx: GenerationContext): string {
	switch (node.kind) {
		case 'leaf':
			return generateLeaf(node, ctx);
		case 'chain':
			return generateChain(node, ctx);
		case 'varRef':
			return generateVarRef(node, ctx);
		case 'ifBranch':
			return generateIfBranch(node, ctx);
		case 'switchCase':
			return generateSwitchCase(node, ctx);
		case 'merge':
			return generateMerge(node, ctx);
		case 'splitInBatches':
			return generateSplitInBatches(node, ctx);
	}
}

/**
 * Generate variable name from node name
 */
function toVarName(nodeName: string): string {
	return nodeName
		.replace(/[^a-zA-Z0-9]/g, '_')
		.replace(/^(\d)/, '_$1')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.replace(/^([A-Z])/, (c) => c.toLowerCase());
}

/**
 * Generate variable declarations
 */
function generateVariableDeclarations(
	variables: Map<string, SemanticNode>,
	ctx: GenerationContext,
): string {
	const declarations: string[] = [];

	for (const [nodeName, node] of variables) {
		const varName = toVarName(nodeName);
		const nodeCall = generateNodeCall(node, ctx);
		declarations.push(`const ${varName} = ${nodeCall};`);
		ctx.generatedVars.add(nodeName);
	}

	return declarations.join('\n');
}

/**
 * Generate SDK code from a composite tree
 *
 * @param tree - The composite tree
 * @param json - Original workflow JSON (for metadata)
 * @returns Generated SDK code
 */
export function generateCode(tree: CompositeTree, json: WorkflowJSON): string {
	const ctx: GenerationContext = {
		indent: 0,
		generatedVars: new Set(),
	};

	const lines: string[] = [];

	// Generate variable declarations first
	if (tree.variables.size > 0) {
		lines.push(generateVariableDeclarations(tree.variables, ctx));
		lines.push('');
	}

	// Generate workflow call
	const workflowId = json.id ?? 'workflow-id';
	const workflowName = json.name;

	lines.push(`workflow('${workflowId}', '${workflowName}')`);

	// Generate each root
	ctx.indent = 1;
	for (const root of tree.roots) {
		const rootCode = generateComposite(root, ctx);
		lines.push(`  .add(${rootCode})`);
	}

	lines.push('  .toJSON();');

	return lines.join('\n');
}
