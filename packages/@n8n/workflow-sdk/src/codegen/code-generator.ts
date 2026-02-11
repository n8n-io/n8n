/**
 * Code Generator
 *
 * Generates LLM-friendly SDK code from a composite tree.
 */

import type { Schema } from 'n8n-workflow';

import type {
	CompositeTree,
	CompositeNode,
	LeafNode,
	ChainNode,
	VariableReference,
	IfElseCompositeNode,
	SwitchCaseCompositeNode,
	MergeCompositeNode,
	SplitInBatchesCompositeNode,
	FanOutCompositeNode,
	ExplicitConnectionsNode,
	MultiOutputNode,
} from './composite-tree';
import {
	AI_CONNECTION_TO_CONFIG_KEY,
	AI_CONNECTION_TO_BUILDER,
	AI_ALWAYS_ARRAY_TYPES,
	AI_OPTIONAL_ARRAY_TYPES,
} from './constants';
import { schemaToOutputSample } from './execution-schema-jsdoc';
import type { NodeExecutionStatus } from './execution-status';
import {
	isTriggerType,
	isStickyNote,
	isMergeType,
	generateDefaultNodeName,
} from './node-type-utils';
import { escapeString, escapeRegexChars } from './string-utils';
import { formatValue } from './subnode-generator';
import type { SemanticGraph, SemanticNode, AiConnectionType } from './types';
import { getVarName, getUniqueVarName } from './variable-names';
import type { WorkflowJSON } from '../types/base';

/**
 * Execution context options for code generation
 */
export interface ExecutionContextOptions {
	/** Node output schemas for JSDoc generation */
	nodeSchemas?: Map<string, Schema>;
	/** Node execution statuses (@success/@error) */
	nodeExecutionStatus?: Map<string, NodeExecutionStatus>;
	/** Expression annotations (expression → formatted value) */
	expressionAnnotations?: Map<string, string>;
	/** Workflow-level execution status JSDoc content */
	workflowStatusJSDoc?: string;
	/** Whether execution schema values were excluded (redacted). When true, adds a comment indicating values are redacted. */
	valuesExcluded?: boolean;
	/** Node names whose output schema was derived from pin data */
	pinnedNodes?: Set<string>;
}

/**
 * Context for code generation
 */
interface GenerationContext {
	indent: number;
	generatedVars: Set<string>;
	variableNodes: Map<string, SemanticNode>; // Nodes that are declared as variables
	graph: SemanticGraph; // Full graph for looking up subnodes
	nodeNameToVarName: Map<string, string>; // Maps node names to unique variable names
	usedVarNames: Set<string>; // Tracks all used variable names to avoid collisions
	subnodeVariables: Map<string, { node: SemanticNode; builderName: string }>; // Subnodes to declare as variables
	// Execution context
	nodeSchemas?: Map<string, Schema>;
	nodeExecutionStatus?: Map<string, NodeExecutionStatus>;
	expressionAnnotations?: Map<string, string>;
	workflowStatusJSDoc?: string;
	valuesExcluded?: boolean;
	pinnedNodes?: Set<string>;
}

/**
 * Get indentation string
 */
function getIndent(ctx: GenerationContext): string {
	return '  '.repeat(ctx.indent);
}

/**
 * Generate a subnode builder call (languageModel, tool, memory, etc.)
 * Recursively includes nested subnodes if the subnode itself has subnodes.
 */
function generateSubnodeCall(
	subnodeNode: SemanticNode,
	builderName: string,
	ctx: GenerationContext,
): string {
	const parts: string[] = [];

	parts.push(`type: '${subnodeNode.type}'`);
	parts.push(`version: ${subnodeNode.json.typeVersion}`);

	const configParts: string[] = [];

	const defaultName = generateDefaultNodeName(subnodeNode.type);
	if (subnodeNode.json.name && subnodeNode.json.name !== defaultName) {
		configParts.push(`name: '${escapeString(subnodeNode.json.name)}'`);
	}

	if (subnodeNode.json.parameters && Object.keys(subnodeNode.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(subnodeNode.json.parameters, ctx)}`);
	}

	if (subnodeNode.json.credentials) {
		configParts.push(`credentials: ${formatValue(subnodeNode.json.credentials, ctx)}`);
	}

	const pos = subnodeNode.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	// Recursively include nested subnodes if this subnode has its own subnodes
	const nestedSubnodesConfig = generateSubnodesConfigForNode(subnodeNode, ctx);
	if (nestedSubnodesConfig) {
		configParts.push(`subnodes: ${nestedSubnodesConfig}`);
	}

	if (configParts.length > 0) {
		parts.push(`config: { ${configParts.join(', ')} }`);
	} else {
		parts.push('config: {}');
	}

	return `${builderName}({ ${parts.join(', ')} })`;
}

/**
 * Generate subnodes config object for a specific node (used for recursion)
 */
function generateSubnodesConfigForNode(node: SemanticNode, ctx: GenerationContext): string | null {
	if (node.subnodes.length === 0) {
		return null;
	}

	// Group subnodes by connection type
	const grouped = new Map<AiConnectionType, SemanticNode[]>();

	for (const sub of node.subnodes) {
		const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
		if (!subnodeNode) continue;

		const existing = grouped.get(sub.connectionType) ?? [];
		existing.push(subnodeNode);
		grouped.set(sub.connectionType, existing);
	}

	// Generate config entries
	const entries: string[] = [];

	for (const [connType, subnodeNodes] of grouped) {
		const configKey = AI_CONNECTION_TO_CONFIG_KEY[connType];
		const builderName = AI_CONNECTION_TO_BUILDER[connType];

		if (subnodeNodes.length === 0) continue;

		const calls = subnodeNodes.map((n) => generateSubnodeCall(n, builderName, ctx));

		if (AI_ALWAYS_ARRAY_TYPES.has(connType)) {
			// Always array type (tools) - generate as array even for single item
			entries.push(`${configKey}: [${calls.join(', ')}]`);
		} else if (AI_OPTIONAL_ARRAY_TYPES.has(connType)) {
			// Optional array type (model) - single if one, array if multiple
			if (subnodeNodes.length === 1) {
				entries.push(`${configKey}: ${calls[0]}`);
			} else {
				entries.push(`${configKey}: [${calls.join(', ')}]`);
			}
		} else {
			// Single item type (memory, etc.)
			entries.push(`${configKey}: ${calls[0]}`);
		}
	}

	if (entries.length === 0) {
		return null;
	}

	return `{ ${entries.join(', ')} }`;
}

/**
 * Generate subnodes config object for a node with AI subnodes
 */
function generateSubnodesConfig(node: SemanticNode, ctx: GenerationContext): string | null {
	return generateSubnodesConfigForNode(node, ctx);
}

/**
 * Recursively collect all subnodes from a node and add them to the context's subnodeVariables.
 * Processes nested subnodes first so they're declared before their parents.
 */
function collectSubnodesAsVariables(node: SemanticNode, ctx: GenerationContext): void {
	if (node.subnodes.length === 0) return;

	for (const sub of node.subnodes) {
		const subnodeNode = ctx.graph.nodes.get(sub.subnodeName);
		if (!subnodeNode) continue;

		// First, recursively collect nested subnodes (they must be declared first)
		collectSubnodesAsVariables(subnodeNode, ctx);

		// Then add this subnode
		const builderName = AI_CONNECTION_TO_BUILDER[sub.connectionType];
		ctx.subnodeVariables.set(sub.subnodeName, { node: subnodeNode, builderName });
	}
}

/**
 * Generate a subnode builder call using variable references for nested subnodes.
 */
function generateSubnodeCallWithVarRefs(
	subnodeNode: SemanticNode,
	builderName: string,
	ctx: GenerationContext,
): string {
	const parts: string[] = [];

	parts.push(`type: '${subnodeNode.type}'`);
	parts.push(`version: ${subnodeNode.json.typeVersion}`);

	const configParts: string[] = [];

	const defaultName = generateDefaultNodeName(subnodeNode.type);
	if (subnodeNode.json.name && subnodeNode.json.name !== defaultName) {
		configParts.push(`name: '${escapeString(subnodeNode.json.name)}'`);
	}

	if (subnodeNode.json.parameters && Object.keys(subnodeNode.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(subnodeNode.json.parameters, ctx)}`);
	}

	if (subnodeNode.json.credentials) {
		configParts.push(`credentials: ${formatValue(subnodeNode.json.credentials, ctx)}`);
	}

	const pos = subnodeNode.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	// Generate nested subnodes config using variable references
	const nestedSubnodesConfig = generateSubnodesConfigWithVarRefs(subnodeNode, ctx);
	if (nestedSubnodesConfig) {
		configParts.push(`subnodes: ${nestedSubnodesConfig}`);
	}

	if (configParts.length > 0) {
		parts.push(`config: { ${configParts.join(', ')} }`);
	} else {
		parts.push('config: {}');
	}

	return `${builderName}({ ${parts.join(', ')} })`;
}

/**
 * Generate subnodes config object using variable references instead of inline calls.
 */
function generateSubnodesConfigWithVarRefs(
	node: SemanticNode,
	ctx: GenerationContext,
): string | null {
	if (node.subnodes.length === 0) {
		return null;
	}

	// Group subnodes by connection type, using variable names
	const grouped = new Map<AiConnectionType, string[]>();

	for (const sub of node.subnodes) {
		const varName = getVarName(sub.subnodeName, ctx);
		const existing = grouped.get(sub.connectionType) ?? [];
		existing.push(varName);
		grouped.set(sub.connectionType, existing);
	}

	// Generate config entries using variable names
	const entries: string[] = [];

	for (const [connType, varNames] of grouped) {
		const configKey = AI_CONNECTION_TO_CONFIG_KEY[connType];

		if (varNames.length === 0) continue;

		if (AI_ALWAYS_ARRAY_TYPES.has(connType)) {
			// Always array type (tools) - generate as array even for single item
			entries.push(`${configKey}: [${varNames.join(', ')}]`);
		} else if (AI_OPTIONAL_ARRAY_TYPES.has(connType)) {
			// Optional array type (model) - single if one, array if multiple
			if (varNames.length === 1) {
				entries.push(`${configKey}: ${varNames[0]}`);
			} else {
				entries.push(`${configKey}: [${varNames.join(', ')}]`);
			}
		} else {
			// Single item type (memory, etc.)
			entries.push(`${configKey}: ${varNames[0]}`);
		}
	}

	if (entries.length === 0) {
		return null;
	}

	return `{ ${entries.join(', ')} }`;
}

/**
 * Generate subnode variable declarations
 */
function generateSubnodeVariableDeclarations(ctx: GenerationContext): string[] {
	const declarations: string[] = [];

	for (const [nodeName, { node, builderName }] of ctx.subnodeVariables) {
		const varName = getUniqueVarName(nodeName, ctx);
		const call = generateSubnodeCallWithVarRefs(node, builderName, ctx);
		declarations.push(`const ${varName} = ${call};`);
	}

	return declarations;
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

	// Always include name for proper roundtrip - parser defaults may differ from codegen defaults
	if (node.json.name) {
		configParts.push(`name: '${escapeString(node.json.name)}'`);
	}

	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(node.json.parameters, ctx)}`);
	}

	if (node.json.credentials) {
		configParts.push(`credentials: ${formatValue(node.json.credentials, ctx)}`);
	}

	// Include position if non-zero
	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	// Include onError if set
	if (node.json.onError) {
		configParts.push(`onError: '${node.json.onError}'`);
	}

	// Include subnodes config if this node has AI subnodes
	// Use variable references if subnodes are declared as variables
	const subnodesConfig =
		ctx.subnodeVariables.size > 0
			? generateSubnodesConfigWithVarRefs(node, ctx)
			: generateSubnodesConfig(node, ctx);
	if (subnodesConfig) {
		configParts.push(`subnodes: ${subnodesConfig}`);
	}

	// Always include config (required by parser), even if empty
	if (configParts.length > 0) {
		const configStr = configParts.join(', ');
		// If config contains @example block comments (expression annotations) OR multi-line content, use multi-line format
		const hasExpressionAnnotations = configStr.includes('/** @example');
		const hasMultiline = configParts.some((entry) => entry.includes('\n'));
		if (hasExpressionAnnotations || hasMultiline) {
			const configIndent = getIndent({ ...ctx, indent: ctx.indent + 2 });
			// Join with commas, ensuring each entry (except last) ends with a comma
			// Note: formatValue already handles commas for nested objects with @example comments,
			// so we only need to add commas at the config entry level
			const withCommas = configParts.map((entry, i) => {
				if (i === configParts.length - 1) return entry; // Last entry, no comma

				// For multi-line entries, check the LAST line to determine comma placement
				const lastLineStart = entry.lastIndexOf('\n');
				const lastLine = lastLineStart >= 0 ? entry.substring(lastLineStart) : entry;

				// If last line already has comma (from formatValue's multi-line handling), no change needed
				if (lastLine.trimEnd().endsWith(',')) {
					return entry;
				}

				// Otherwise, add comma at the end
				return entry + ',';
			});
			parts.push(
				`${innerIndent}config: {\n${withCommas.map((p) => `${configIndent}${p}`).join('\n')}\n${innerIndent}}`,
			);
		} else {
			parts.push(`${innerIndent}config: { ${configStr} }`);
		}
	} else {
		parts.push(`${innerIndent}config: {}`);
	}

	// Add output from execution schema if available (for data flow awareness)
	const nodeName = node.json.name;
	if (nodeName && ctx.nodeSchemas?.has(nodeName)) {
		const schema = ctx.nodeSchemas.get(nodeName)!;
		const outputSample = schemaToOutputSample(schema, ctx.valuesExcluded);
		if (outputSample && Object.keys(outputSample).length > 0) {
			// Add comment if values are excluded (redacted)
			if (ctx.valuesExcluded) {
				parts.push(`${innerIndent}// Output values redacted`);
			}
			if (ctx.pinnedNodes?.has(nodeName)) {
				parts.push(`${innerIndent}// Data is pinned. User must unpin node for real data`);
			}
			parts.push(`${innerIndent}output: [${formatValue(outputSample, ctx)}]`);
		}
		// If schema exists but is empty, don't show output: [{}] - it's not useful
	}

	return `{\n${parts.join(',\n')}\n${indent}}`;
}

/**
 * Get variable reference or generate inline node() call for named syntax composites.
 * Used by ifElse, merge, switchCase (which require pre-declared nodes in named syntax).
 */
function getVarRefOrInlineNode(node: SemanticNode, ctx: GenerationContext): string {
	const nodeName = node.json.name;
	if (nodeName && ctx.variableNodes.has(nodeName)) {
		return getVarName(nodeName, ctx);
	}
	// Generate inline node() call for named syntax
	return generateNodeCall(node, ctx);
}

/**
 * Get variable names of nodes whose top-left corner is inside a sticky note's bounds.
 * Excludes other sticky notes from the result.
 */
function getNodesInsideSticky(stickyNode: SemanticNode, ctx: GenerationContext): string[] {
	const pos = stickyNode.json.position ?? [0, 0];
	const params = stickyNode.json.parameters;
	const width = Number(params?.width) || 0;
	const height = Number(params?.height) || 0;

	// If sticky has no dimensions, return empty array
	if (width === 0 || height === 0) return [];

	const containedNodes: string[] = [];

	for (const [nodeName, node] of ctx.graph.nodes) {
		// Skip other sticky notes
		if (isStickyNote(node.type)) continue;

		const nodePos = node.json.position ?? [0, 0];

		// Check if node's top-left corner is inside the sticky bounds
		if (
			nodePos[0] >= pos[0] &&
			nodePos[0] <= pos[0] + width &&
			nodePos[1] >= pos[1] &&
			nodePos[1] <= pos[1] + height
		) {
			const varName = ctx.nodeNameToVarName.get(nodeName);
			if (varName) containedNodes.push(varName);
		}
	}

	return containedNodes;
}

/**
 * Generate sticky note call
 * New signature: sticky(content, nodes, config?)
 */
function generateStickyCall(node: SemanticNode, ctx: GenerationContext): string {
	const content = escapeString((node.json.parameters?.content as string) ?? '');

	// Get nodes inside this sticky's bounds
	const nodesInside = getNodesInsideSticky(node, ctx);
	const nodesStr = `[${nodesInside.join(', ')}]`;

	const options: string[] = [];

	// Only include name if it's truthy - parser will generate unique names for unnamed sticky notes
	if (node.json.name) {
		options.push(`name: '${escapeString(node.json.name)}'`);
	}

	const params = node.json.parameters;
	if (params?.color !== undefined) {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string -- color is a string/number primitive
		options.push(`color: ${String(params.color)}`);
	}
	if (params?.width !== undefined) {
		options.push(`width: ${Number(params.width)}`);
	}
	if (params?.height !== undefined) {
		options.push(`height: ${Number(params.height)}`);
	}

	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		options.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
	return `sticky('${content}', ${nodesStr}${optionsStr})`;
}

/**
 * Generate merge factory call
 * Uses simplified syntax: merge({ version: N, config: {...} })
 */
function generateMergeCall(node: SemanticNode, ctx: GenerationContext): string {
	const indent = getIndent(ctx);
	const innerIndent = getIndent({ ...ctx, indent: ctx.indent + 1 });

	const parts: string[] = [];

	parts.push(`${innerIndent}version: ${node.json.typeVersion}`);

	const configParts: string[] = [];

	// Always include name for proper roundtrip
	if (node.json.name) {
		configParts.push(`name: '${escapeString(node.json.name)}'`);
	}

	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(node.json.parameters, ctx)}`);
	}

	if (node.json.credentials) {
		configParts.push(`credentials: ${formatValue(node.json.credentials, ctx)}`);
	}

	// Include position if non-zero
	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	// Include onError if set
	if (node.json.onError) {
		configParts.push(`onError: '${node.json.onError}'`);
	}

	if (configParts.length > 0) {
		parts.push(`${innerIndent}config: { ${configParts.join(', ')} }`);
	}

	return `merge({\n${parts.join(',\n')}\n${indent}})`;
}

/**
 * Generate node call
 */
function generateNodeCall(node: SemanticNode, ctx: GenerationContext): string {
	if (isStickyNote(node.type)) {
		return generateStickyCall(node, ctx);
	}

	if (isMergeType(node.type)) {
		return generateMergeCall(node, ctx);
	}

	const config = generateNodeConfig(node, ctx);

	if (isTriggerType(node.type)) {
		return `trigger(${config})`;
	} else {
		return `node(${config})`;
	}
}

/**
 * Generate code for a leaf node, using variable reference if the node is declared as a variable
 */
function generateLeafCode(leaf: LeafNode, ctx: GenerationContext): string {
	const nodeName = leaf.node.json.name;
	if (nodeName && ctx.variableNodes.has(nodeName)) {
		// Use variable reference for nodes that are declared as variables
		// (JSDoc is already added in variable declaration)
		return getVarName(nodeName, ctx);
	}

	// For inline nodes, prepend JSDoc if execution context is available
	const nodeCall = generateNodeCall(leaf.node, ctx);
	if (nodeName) {
		const jsdoc = generateNodeJSDoc(nodeName, ctx);
		if (jsdoc) {
			return `${jsdoc}\n${nodeCall}`;
		}
	}

	return nodeCall;
}

/**
 * Generate code for a leaf node
 */
function generateLeaf(leaf: LeafNode, ctx: GenerationContext): string {
	let code = generateLeafCode(leaf, ctx);

	// Add .onError() if node has an error handler
	if (leaf.errorHandler) {
		const errorHandlerCode = generateComposite(leaf.errorHandler, ctx);
		code += `\n${getIndent(ctx)}.onError(${errorHandlerCode})`;
	}

	return code;
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
			parts.push(`.to(${nodeCode})`);
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
 * Generate code for a branch that may be single, array (fan-out), or null
 */
function generateBranchCode(
	branch: CompositeNode | CompositeNode[] | null,
	ctx: GenerationContext,
): string {
	if (branch === null) return 'null';

	if (Array.isArray(branch)) {
		// Fan-out within branch - generate as plain array [branch1, branch2, ...]
		const branchesCode = branch.map((b) => generateComposite(b, ctx)).join(', ');
		return `[${branchesCode}]`;
	}

	return generateComposite(branch, ctx);
}

/**
 * Generate code for an IF branch using fluent API syntax
 * Generates: ifNode.onTrue(trueHandler).onFalse(falseHandler)
 */
function generateIfElse(ifElse: IfElseCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// For fluent syntax, we need a variable reference to the IF node
	const ifNodeRef = getVarRefOrInlineNode(ifElse.ifNode, ctx);

	// Build the fluent chain
	let code = ifNodeRef;

	// Add onTrue if true branch exists
	if (ifElse.trueBranch !== null) {
		const trueBranchCode = generateBranchCode(ifElse.trueBranch, innerCtx);
		code += `.onTrue(${trueBranchCode})`;
	}

	// Add onFalse if false branch exists
	if (ifElse.falseBranch !== null) {
		const falseBranchCode = generateBranchCode(ifElse.falseBranch, innerCtx);
		code += `.onFalse(${falseBranchCode})`;
	}

	return code;
}

/**
 * Generate code for a switch case using fluent API syntax
 * Generates: switchNode.onCase(0, caseA).onCase(1, caseB)
 */
function generateSwitchCase(switchCase: SwitchCaseCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// For fluent syntax, we need a variable reference to the Switch node
	const switchNodeRef = getVarRefOrInlineNode(switchCase.switchNode, ctx);

	// If no cases, just return the switch node reference
	if (switchCase.cases.length === 0) {
		return switchNodeRef;
	}

	// Build the fluent chain with onCase calls
	let code = switchNodeRef;
	switchCase.cases.forEach((c, i) => {
		const caseIndex = switchCase.caseIndices[i] ?? i;
		const caseCode = generateBranchCode(c, innerCtx);
		code += `.onCase(${caseIndex}, ${caseCode})`;
	});

	return code;
}

/**
 * Generate code for a merge (named syntax only)
 * Note: We keep using the old merge() syntax for merges inside branch handlers
 * because the .input(n) syntax would create incorrect connections when the merge
 * is nested inside IF/Switch branches.
 */
function generateMerge(merge: MergeCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// Generate named input entries: { input0: ..., input1: ..., ... }
	const inputEntries = merge.branches
		.map((b, i) => {
			const inputIndex = merge.inputIndices[i] ?? i;
			return `input${inputIndex}: ${generateComposite(b, innerCtx)}`;
		})
		.join(', ');

	// For named syntax, we need a variable reference to the Merge node
	const mergeNodeRef = getVarRefOrInlineNode(merge.mergeNode, ctx);

	return `merge(${mergeNodeRef}, { ${inputEntries} })`;
}

/**
 * Check if a branch (single, array, or null) ends with a varRef (for loop detection)
 */
function branchEndsWithVarRef(branch: CompositeNode | CompositeNode[] | null): boolean {
	if (branch === null) return false;

	if (Array.isArray(branch)) {
		// For array branches, check if any branch ends with varRef
		return branch.some((b) => branchEndsWithVarRef(b));
	}

	if (branch.kind === 'chain') {
		const lastNode = branch.nodes[branch.nodes.length - 1];
		return lastNode?.kind === 'varRef';
	}

	return branch.kind === 'varRef';
}

/**
 * Strip the trailing varRef from a branch code string.
 * For example: "process.to(sibVar)" -> "process"
 * Or just "sibVar" -> null (entire branch is just the varRef)
 */
function stripTrailingVarRefFromCode(code: string, varName: string): string | null {
	// Pattern: ".to(varName)" at end - strip it
	const toPattern = new RegExp(`\\.to\\(${escapeRegexChars(varName)}\\)$`);
	if (toPattern.test(code)) {
		return code.replace(toPattern, '');
	}

	// Pattern: entire code is just the varName (self-loop with no processing)
	if (code.trim() === varName) {
		return null;
	}

	return code;
}

/**
 * Generate code for split in batches using fluent API syntax:
 * splitInBatches(sibVar).onEachBatch(eachCode.to(nextBatch(sibVar))).onDone(doneCode)
 */
function generateSplitInBatches(sib: SplitInBatchesCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// Get the SIB node variable name (it should always be a variable for cycle reference)
	const sibVarName = getVarName(sib.sibNode.name, ctx);

	// Start with splitInBatches(sibVar)
	let code = `splitInBatches(${sibVarName})`;

	// Add .onEachBatch() if there's a loop chain (output 1)
	if (sib.loopChain) {
		let eachCode: string;

		// Handle array (fan-out) case specially - need to process nextBatch for each branch
		if (Array.isArray(sib.loopChain)) {
			const transformedBranches = sib.loopChain.map((branch) => {
				let branchCode = generateComposite(branch, innerCtx);

				// Check if this branch ends with cycle back to SIB
				if (branchEndsWithVarRef(branch)) {
					const strippedCode = stripTrailingVarRefFromCode(branchCode, sibVarName);
					if (strippedCode === null) {
						// Branch is just the self-loop
						branchCode = `nextBatch(${sibVarName})`;
					} else {
						// Has processing nodes before the loop back
						branchCode = `${strippedCode}.to(nextBatch(${sibVarName}))`;
					}
				}

				return branchCode;
			});
			eachCode = `[${transformedBranches.join(', ')}]`;
		} else {
			// Single composite case
			eachCode = generateBranchCode(sib.loopChain, innerCtx);

			// Check if loop chain ends with cycle back to SIB
			if (branchEndsWithVarRef(sib.loopChain)) {
				// Strip trailing varRef and replace with nextBatch()
				const strippedCode = stripTrailingVarRefFromCode(eachCode, sibVarName);
				if (strippedCode === null) {
					// Entire each branch is just the self-loop (no processing nodes)
					eachCode = `nextBatch(${sibVarName})`;
				} else {
					// Has processing nodes before the loop back
					eachCode = `${strippedCode}.to(nextBatch(${sibVarName}))`;
				}
			}
		}

		code += `\n${getIndent(ctx)}.onEachBatch(${eachCode})`;
	}

	// Add .onDone() if there's a done chain (output 0)
	if (sib.doneChain) {
		const doneCode = generateBranchCode(sib.doneChain, innerCtx);
		code += `\n${getIndent(ctx)}.onDone(${doneCode})`;
	}

	return code;
}

/**
 * Generate code for a fan-out pattern (one source to multiple parallel targets)
 */
function generateFanOut(fanOut: FanOutCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// Generate source node code
	const sourceCode = generateComposite(fanOut.sourceNode, ctx);

	// Generate all target branches as plain array
	const targetsCode = fanOut.targets
		.map((target) => generateComposite(target, innerCtx))
		.join(',\n' + getIndent(innerCtx));

	// Return with plain array syntax for clarity
	return `${sourceCode}\n${getIndent(ctx)}.to([\n${getIndent(innerCtx)}${targetsCode}])`;
}

/**
 * Generate code for explicit connections pattern (e.g., SIB→Merge at different inputs)
 */
function generateExplicitConnections(
	explicitConns: ExplicitConnectionsNode,
	ctx: GenerationContext,
): string {
	// Generate variable references to the nodes involved
	// The actual .add() and .connect() calls will be generated at the root level
	// For now, just return the variable reference to the first node
	if (explicitConns.nodes.length > 0) {
		const firstNode = explicitConns.nodes[0];
		const varName = getVarName(firstNode.name, ctx);
		return varName;
	}
	return '';
}

/**
 * Generate code for multi-output node (generates variable reference, actual connections at root level)
 */
function generateMultiOutput(multiOutput: MultiOutputNode, ctx: GenerationContext): string {
	// The multi-output node becomes a variable reference
	// The actual .output(n).to() calls are generated at the root level via flattenToWorkflowCalls
	const varName = getVarName(multiOutput.sourceNode.name, ctx);
	return varName;
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
		case 'ifElse':
			return generateIfElse(node, ctx);
		case 'switchCase':
			return generateSwitchCase(node, ctx);
		case 'merge':
			return generateMerge(node, ctx);
		case 'splitInBatches':
			return generateSplitInBatches(node, ctx);
		case 'fanOut':
			return generateFanOut(node, ctx);
		case 'explicitConnections':
			return generateExplicitConnections(node, ctx);
		case 'multiOutput':
			return generateMultiOutput(node, ctx);
	}
}

/**
 * Generate JSDoc comment for a node based on execution context
 */
function generateNodeJSDoc(nodeName: string, ctx: GenerationContext): string | null {
	const jsdocParts: string[] = [];

	// Add execution status if available (output schema is now in the output property)
	const status = ctx.nodeExecutionStatus?.get(nodeName);
	if (status?.status === 'error') {
		jsdocParts.push(`@nodeExecutionStatus error - ${status.errorMessage}`);
	} else if (status?.status === 'success') {
		jsdocParts.push('@nodeExecutionStatus success');
	}

	if (jsdocParts.length === 0) return null;

	const lines: string[] = ['/**'];
	for (const part of jsdocParts) {
		for (const line of part.split('\n')) {
			lines.push(` * ${line}`);
		}
	}
	lines.push(' */');

	return lines.join('\n');
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
		const varName = getUniqueVarName(nodeName, ctx);
		const nodeCall = generateNodeCall(node, ctx);

		// Add JSDoc if execution context is available
		const jsdoc = generateNodeJSDoc(nodeName, ctx);
		if (jsdoc) {
			declarations.push(`${jsdoc}\nconst ${varName} = ${nodeCall};`);
		} else {
			declarations.push(`const ${varName} = ${nodeCall};`);
		}

		ctx.generatedVars.add(nodeName);
	}

	return declarations.join('\n\n');
}

/**
 * Recursively collect all nested multiOutput nodes from a composite tree.
 * These need to be extracted and their output connections generated as separate .add() calls.
 */
function collectNestedMultiOutputs(node: CompositeNode, collected: MultiOutputNode[]): void {
	if (!node) return;

	if (node.kind === 'multiOutput') {
		collected.push(node);
		// Also check the output targets for nested multiOutput nodes
		for (const [, target] of node.outputTargets) {
			collectNestedMultiOutputs(target, collected);
		}
	} else if (node.kind === 'chain') {
		for (const n of node.nodes) {
			collectNestedMultiOutputs(n, collected);
		}
	} else if (node.kind === 'splitInBatches') {
		const sib = node;
		if (sib.doneChain) {
			if (Array.isArray(sib.doneChain)) {
				for (const b of sib.doneChain) collectNestedMultiOutputs(b, collected);
			} else {
				collectNestedMultiOutputs(sib.doneChain, collected);
			}
		}
		if (sib.loopChain) {
			if (Array.isArray(sib.loopChain)) {
				for (const b of sib.loopChain) collectNestedMultiOutputs(b, collected);
			} else {
				collectNestedMultiOutputs(sib.loopChain, collected);
			}
		}
	} else if (node.kind === 'ifElse') {
		const ifElse = node;
		if (ifElse.trueBranch) {
			if (Array.isArray(ifElse.trueBranch)) {
				for (const b of ifElse.trueBranch) collectNestedMultiOutputs(b, collected);
			} else {
				collectNestedMultiOutputs(ifElse.trueBranch, collected);
			}
		}
		if (ifElse.falseBranch) {
			if (Array.isArray(ifElse.falseBranch)) {
				for (const b of ifElse.falseBranch) collectNestedMultiOutputs(b, collected);
			} else {
				collectNestedMultiOutputs(ifElse.falseBranch, collected);
			}
		}
	} else if (node.kind === 'switchCase') {
		const switchCase = node;
		for (const c of switchCase.cases) {
			if (c) {
				if (Array.isArray(c)) {
					for (const b of c) collectNestedMultiOutputs(b, collected);
				} else {
					collectNestedMultiOutputs(c, collected);
				}
			}
		}
	} else if (node.kind === 'fanOut') {
		const fanOut = node;
		collectNestedMultiOutputs(fanOut.sourceNode, collected);
		for (const t of fanOut.targets) {
			collectNestedMultiOutputs(t, collected);
		}
	} else if (node.kind === 'merge') {
		const merge = node;
		for (const b of merge.branches) {
			collectNestedMultiOutputs(b, collected);
		}
	}
	// leaf, varRef, explicitConnections don't need recursive checking
}

/**
 * Generate the output connections for a multiOutput node as separate .add() calls.
 */
function generateMultiOutputConnections(
	multiOutput: MultiOutputNode,
	ctx: GenerationContext,
): Array<[string, string]> {
	const calls: Array<[string, string]> = [];
	const sourceVarName = getVarName(multiOutput.sourceNode.name, ctx);

	// Sort by output index for consistent ordering
	const sortedOutputs = [...multiOutput.outputTargets.entries()].sort((a, b) => a[0] - b[0]);

	for (const [outputIndex, targetComposite] of sortedOutputs) {
		const targetCode = generateComposite(targetComposite, ctx);
		calls.push(['add', `${sourceVarName}.output(${outputIndex}).to(${targetCode})`]);
	}

	return calls;
}

/**
 * Flatten a composite tree into workflow-level calls.
 * Returns array of [method, code] tuples where method is 'add', 'to', or 'connect'.
 */
function flattenToWorkflowCalls(
	root: CompositeNode,
	ctx: GenerationContext,
): Array<[string, string]> {
	const calls: Array<[string, string]> = [];

	if (root.kind === 'multiOutput') {
		// Multi-output node: generate .add(sourceNode) then .add(sourceNode.output(n).to(target)) for each output
		const multiOutput = root;
		const sourceVarName = getVarName(multiOutput.sourceNode.name, ctx);

		// First, add the source node itself
		calls.push(['add', sourceVarName]);

		// Then, for each output with targets, generate sourceNode.output(n).to(target)
		// Sort by output index for consistent ordering
		const sortedOutputs = [...multiOutput.outputTargets.entries()].sort((a, b) => a[0] - b[0]);

		for (const [outputIndex, targetComposite] of sortedOutputs) {
			const targetCode = generateComposite(targetComposite, ctx);
			calls.push(['add', `${sourceVarName}.output(${outputIndex}).to(${targetCode})`]);
		}
	} else if (root.kind === 'explicitConnections') {
		// Explicit connections pattern: generate .add() for each node, then .connect() for each connection
		const explicitConns = root;

		// Add each node (use variable references since they're already declared)
		for (const node of explicitConns.nodes) {
			const varName = getVarName(node.name, ctx);
			calls.push(['add', varName]);
		}

		// Generate .connect() calls for each explicit connection
		for (const conn of explicitConns.connections) {
			const sourceVar = getVarName(conn.sourceNode, ctx);
			const targetVar = getVarName(conn.targetNode, ctx);
			calls.push([
				'connect',
				`${sourceVar}, ${conn.sourceOutput}, ${targetVar}, ${conn.targetInput}`,
			]);
		}
	} else if (root.kind === 'chain') {
		// Chain: first node is .add(), rest are .to()
		// Special handling when chain contains a multiOutput node
		const nestedMultiOutputsInChain: MultiOutputNode[] = [];

		for (let i = 0; i < root.nodes.length; i++) {
			const node = root.nodes[i];

			if (node.kind === 'multiOutput') {
				// When encountering a multiOutput node in a chain:
				// 1. Generate .to(sourceNode) to connect the previous node to the multi-output source
				// 2. Then generate separate .add() calls for each output
				const multiOutput = node;
				const sourceVarName = getVarName(multiOutput.sourceNode.name, ctx);

				// Connect to the multi-output source node
				const method = i === 0 ? 'add' : 'to';
				calls.push([method, sourceVarName]);

				// Generate .add(sourceNode.output(n).to(target)) for each output
				const sortedOutputs = [...multiOutput.outputTargets.entries()].sort((a, b) => a[0] - b[0]);

				for (const [outputIndex, targetComposite] of sortedOutputs) {
					const targetCode = generateComposite(targetComposite, ctx);
					calls.push(['add', `${sourceVarName}.output(${outputIndex}).to(${targetCode})`]);
				}
			} else {
				const method = i === 0 ? 'add' : 'to';
				const code = generateComposite(node, ctx);
				calls.push([method, code]);

				// Check for nested multiOutput nodes inside this composite (e.g., inside splitInBatches)
				collectNestedMultiOutputs(node, nestedMultiOutputsInChain);
			}
		}

		// Generate output connections for any nested multiOutput nodes found in the chain
		for (const multiOutput of nestedMultiOutputsInChain) {
			const multiOutputCalls = generateMultiOutputConnections(multiOutput, ctx);
			calls.push(...multiOutputCalls);
		}
	} else {
		// Single node: just .add()
		calls.push(['add', generateComposite(root, ctx)]);

		// Check for nested multiOutput nodes inside composites like splitInBatches
		// These need their output connections generated as separate .add() calls
		const nestedMultiOutputs: MultiOutputNode[] = [];
		collectNestedMultiOutputs(root, nestedMultiOutputs);

		for (const multiOutput of nestedMultiOutputs) {
			const multiOutputCalls = generateMultiOutputConnections(multiOutput, ctx);
			calls.push(...multiOutputCalls);
		}
	}

	return calls;
}

/**
 * Generate SDK code from a composite tree
 *
 * @param tree - The composite tree
 * @param json - Original workflow JSON (for metadata)
 * @param graph - The semantic graph
 * @param executionContext - Optional execution context for annotations
 * @returns Generated SDK code
 */
export function generateCode(
	tree: CompositeTree,
	json: WorkflowJSON,
	graph: SemanticGraph,
	executionContext?: ExecutionContextOptions,
): string {
	const ctx: GenerationContext = {
		indent: 0,
		generatedVars: new Set(),
		variableNodes: tree.variables,
		graph,
		nodeNameToVarName: new Map(),
		usedVarNames: new Set(),
		subnodeVariables: new Map(),
		// Execution context
		nodeSchemas: executionContext?.nodeSchemas,
		nodeExecutionStatus: executionContext?.nodeExecutionStatus,
		expressionAnnotations: executionContext?.expressionAnnotations,
		workflowStatusJSDoc: executionContext?.workflowStatusJSDoc,
		valuesExcluded: executionContext?.valuesExcluded,
		pinnedNodes: executionContext?.pinnedNodes,
	};

	// Collect all subnodes from all nodes in the graph (not just variable nodes)
	for (const node of graph.nodes.values()) {
		collectSubnodesAsVariables(node, ctx);
	}

	const lines: string[] = [];

	// Generate subnode variable declarations FIRST (since they're referenced by regular nodes)
	const subnodeDeclarations = generateSubnodeVariableDeclarations(ctx);
	if (subnodeDeclarations.length > 0) {
		lines.push(...subnodeDeclarations);
		lines.push('');
	}

	// Generate regular node variable declarations
	if (tree.variables.size > 0) {
		lines.push(generateVariableDeclarations(tree.variables, ctx));
		lines.push('');
	}

	// Generate workflow call
	const workflowId = escapeString(json.id ?? '');
	const workflowName = escapeString(json.name ?? '');

	// Include settings if present
	const settingsStr =
		json.settings && Object.keys(json.settings).length > 0 ? `, ${formatValue(json.settings)}` : '';

	// Start with workflow variable declaration
	lines.push(`const wf = workflow('${workflowId}', '${workflowName}'${settingsStr});`);

	// Generate each root, flattening chains to workflow-level calls
	ctx.indent = 1;
	const workflowCalls: string[] = [];
	for (const root of tree.roots) {
		const calls = flattenToWorkflowCalls(root, ctx);
		for (const [method, code] of calls) {
			workflowCalls.push(`  .${method}(${code})`);
		}
	}

	// Generate deferred input connections with .input(n) syntax
	// These are connections from IF/Switch branches to multi-input nodes (like Merge)
	// that need to be expressed at root level rather than nested inside branches
	for (const conn of tree.deferredConnections) {
		const sourceVarName = getVarName(conn.sourceNodeName, ctx);
		const targetVarName = getVarName(conn.targetNode.name, ctx);

		// Handle output index if not default (0)
		const sourceRef =
			conn.sourceOutputIndex > 0
				? `${sourceVarName}.output(${conn.sourceOutputIndex})`
				: sourceVarName;

		// Generate: .add(source.to(target.input(n)))
		workflowCalls.push(`  .add(${sourceRef}.to(${targetVarName}.input(${conn.targetInputIndex})))`);
	}

	// Generate deferred merge downstream chains
	// These are the output chains from merge nodes that received deferred connections
	for (const downstream of tree.deferredMergeDownstreams) {
		const mergeVarName = getVarName(downstream.mergeNode.name, ctx);
		if (downstream.downstreamChain) {
			const chainCode = generateComposite(downstream.downstreamChain, ctx);
			workflowCalls.push(`  .add(${mergeVarName})`);
			workflowCalls.push(`  .to(${chainCode})`);
		}
	}

	// Add workflow calls and return statement
	lines.push('');

	// Add workflow-level execution status JSDoc if available
	if (ctx.workflowStatusJSDoc) {
		const jsdocLines = ['/**'];
		for (const line of ctx.workflowStatusJSDoc.split('\n')) {
			jsdocLines.push(` * ${line}`);
		}
		jsdocLines.push(' */');
		lines.push(jsdocLines.join('\n'));
	}

	if (workflowCalls.length > 0) {
		lines.push('export default wf');
		lines.push(...workflowCalls);
	} else {
		lines.push('export default wf');
	}

	return lines.join('\n');
}
