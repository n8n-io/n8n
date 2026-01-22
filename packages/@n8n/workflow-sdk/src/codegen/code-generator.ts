/**
 * Code Generator
 *
 * Generates LLM-friendly SDK code from a composite tree.
 */

import type { WorkflowJSON } from '../types/base';
import type { SemanticGraph, SemanticNode, AiConnectionType } from './types';
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
	FanOutCompositeNode,
} from './composite-tree';

/**
 * Context for code generation
 */
interface GenerationContext {
	indent: number;
	generatedVars: Set<string>;
	variableNodes: Map<string, SemanticNode>; // Nodes that are declared as variables
	graph: SemanticGraph; // Full graph for looking up subnodes
}

/**
 * Get indentation string
 */
function getIndent(ctx: GenerationContext): string {
	return '  '.repeat(ctx.indent);
}

/**
 * Escape a string for use in generated code
 * Uses unicode escape sequences to preserve special characters through roundtrip
 */
function escapeString(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\u2018/g, '\\u2018') // LEFT SINGLE QUOTATION MARK - preserve as unicode
		.replace(/\u2019/g, '\\u2019') // RIGHT SINGLE QUOTATION MARK - preserve as unicode
		.replace(/\u201C/g, '\\u201C') // LEFT DOUBLE QUOTATION MARK - preserve as unicode
		.replace(/\u201D/g, '\\u201D') // RIGHT DOUBLE QUOTATION MARK - preserve as unicode
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

/**
 * Generate the default node name from a node type
 * e.g., 'n8n-nodes-base.httpRequest' -> 'HTTP Request'
 */
function generateDefaultNodeName(type: string): string {
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/Http/g, 'HTTP')
		.replace(/Api/g, 'API')
		.replace(/Url/g, 'URL')
		.replace(/Id/g, 'ID')
		.replace(/Json/g, 'JSON')
		.replace(/Xml/g, 'XML')
		.replace(/Sql/g, 'SQL')
		.replace(/Ai/g, 'AI')
		.replace(/Aws/g, 'AWS')
		.replace(/Gcp/g, 'GCP')
		.replace(/Ssh/g, 'SSH')
		.replace(/Ftp/g, 'FTP')
		.replace(/Csv/g, 'CSV');
}

/**
 * Reserved keywords that cannot be used as variable names
 */
const RESERVED_KEYWORDS = new Set([
	// JavaScript reserved
	'break',
	'case',
	'catch',
	'class',
	'const',
	'continue',
	'debugger',
	'default',
	'delete',
	'do',
	'else',
	'export',
	'extends',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'let',
	'new',
	'return',
	'static',
	'super',
	'switch',
	'this',
	'throw',
	'try',
	'typeof',
	'var',
	'void',
	'while',
	'with',
	'yield',
	// SDK functions
	'workflow',
	'trigger',
	'node',
	'merge',
	'ifBranch',
	'switchCase',
	'splitInBatches',
	'sticky',
	'languageModel',
	'tool',
	'memory',
	'outputParser',
	'textSplitter',
	'embeddings',
	'vectorStore',
	'retriever',
	'document',
]);

/**
 * Check if a key needs to be quoted to be a valid JS identifier
 */
function needsQuoting(key: string): boolean {
	// Valid JS identifier: starts with letter, _, or $, followed by letters, digits, _, or $
	return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/**
 * Format an object key for code output
 */
function formatKey(key: string): string {
	return needsQuoting(key) ? `'${escapeString(key)}'` : key;
}

/**
 * Format a value for code output
 */
function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return `'${escapeString(value)}'`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		return `[${value.map(formatValue).join(', ')}]`;
	}
	if (typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return '{}';
		return `{ ${entries.map(([k, v]) => `${formatKey(k)}: ${formatValue(v)}`).join(', ')} }`;
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
 * Map AI connection types to their config key names
 */
const AI_CONNECTION_TO_CONFIG_KEY: Record<AiConnectionType, string> = {
	ai_languageModel: 'model',
	ai_memory: 'memory',
	ai_tool: 'tools', // plural - can have multiple
	ai_outputParser: 'outputParser',
	ai_embedding: 'embedding',
	ai_vectorStore: 'vectorStore',
	ai_retriever: 'retriever',
	ai_document: 'documentLoader',
	ai_textSplitter: 'textSplitter',
};

/**
 * Map AI connection types to their builder function names
 */
const AI_CONNECTION_TO_BUILDER: Record<AiConnectionType, string> = {
	ai_languageModel: 'languageModel',
	ai_memory: 'memory',
	ai_tool: 'tool',
	ai_outputParser: 'outputParser',
	ai_embedding: 'embedding',
	ai_vectorStore: 'vectorStore',
	ai_retriever: 'retriever',
	ai_document: 'documentLoader',
	ai_textSplitter: 'textSplitter',
};

/**
 * AI connection types that are ALWAYS arrays (even with single item)
 */
const AI_ALWAYS_ARRAY_TYPES = new Set<AiConnectionType>(['ai_tool']);

/**
 * AI connection types that can be single or array (array only when multiple)
 */
const AI_OPTIONAL_ARRAY_TYPES = new Set<AiConnectionType>(['ai_languageModel']);

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
		configParts.push(`parameters: ${formatValue(subnodeNode.json.parameters)}`);
	}

	if (subnodeNode.json.credentials) {
		configParts.push(`credentials: ${formatValue(subnodeNode.json.credentials)}`);
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
		parts.push(`config: {}`);
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
 * Generate node config object
 */
function generateNodeConfig(node: SemanticNode, ctx: GenerationContext): string {
	const indent = getIndent(ctx);
	const innerIndent = getIndent({ ...ctx, indent: ctx.indent + 1 });

	const parts: string[] = [];

	parts.push(`${innerIndent}type: '${node.type}'`);
	parts.push(`${innerIndent}version: ${node.json.typeVersion}`);

	const configParts: string[] = [];

	const defaultName = generateDefaultNodeName(node.type);
	if (node.json.name && node.json.name !== defaultName) {
		configParts.push(`name: '${escapeString(node.json.name)}'`);
	}

	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(node.json.parameters)}`);
	}

	if (node.json.credentials) {
		configParts.push(`credentials: ${formatValue(node.json.credentials)}`);
	}

	// Include position if non-zero
	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	// Include subnodes config if this node has AI subnodes
	const subnodesConfig = generateSubnodesConfig(node, ctx);
	if (subnodesConfig) {
		configParts.push(`subnodes: ${subnodesConfig}`);
	}

	// Always include config (required by parser), even if empty
	if (configParts.length > 0) {
		parts.push(`${innerIndent}config: { ${configParts.join(', ')} }`);
	} else {
		parts.push(`${innerIndent}config: {}`);
	}

	return `{\n${parts.join(',\n')}\n${indent}}`;
}

/**
 * Generate flat config object for composite functions (ifBranch, merge, switchCase, splitInBatches).
 * These expect { name?, version?, parameters?, credentials?, position? } directly,
 * not the { type, version, config: { ... } } format used by node().
 */
function generateFlatNodeConfig(node: SemanticNode): string {
	const parts: string[] = [];

	// These functions have name, version, parameters, credentials, position at the TOP level
	// (not nested in a config object like node())

	if (node.json.typeVersion != null) {
		parts.push(`version: ${node.json.typeVersion}`);
	}

	// ALWAYS include name for composite nodes (ifBranch, merge, switchCase, splitInBatches)
	// because the parser's hardcoded defaults ("IF", "Merge", "Switch", "Split In Batches")
	// don't match what generateDefaultNodeName() computes from the node type.
	// Without this, roundtrip fails with name mismatches.
	if (node.json.name) {
		parts.push(`name: '${escapeString(node.json.name)}'`);
	}

	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		parts.push(`parameters: ${formatValue(node.json.parameters)}`);
	}

	if (node.json.credentials) {
		parts.push(`credentials: ${formatValue(node.json.credentials)}`);
	}

	// Include position if non-zero
	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		parts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	return `{ ${parts.join(', ')} }`;
}

/**
 * Generate flat node config or variable reference for composite functions.
 * Used by ifBranch, merge, switchCase, and splitInBatches.
 */
function generateFlatNodeOrVarRef(node: SemanticNode, ctx: GenerationContext): string {
	const nodeName = node.json.name;
	if (nodeName && ctx.variableNodes.has(nodeName)) {
		return toVarName(nodeName);
	}
	return generateFlatNodeConfig(node);
}

/**
 * Check if node is a sticky note
 */
function isStickyNote(type: string): boolean {
	return type === 'n8n-nodes-base.stickyNote';
}

/**
 * Generate sticky note call
 */
function generateStickyCall(node: SemanticNode): string {
	const content = escapeString((node.json.parameters?.content as string) ?? '');
	const options: string[] = [];

	// Only include name if it's truthy - parser will generate unique names for unnamed sticky notes
	if (node.json.name) {
		options.push(`name: '${escapeString(node.json.name)}'`);
	}

	const params = node.json.parameters;
	if (params?.color !== undefined) {
		options.push(`color: ${params.color}`);
	}
	if (params?.width !== undefined) {
		options.push(`width: ${params.width}`);
	}
	if (params?.height !== undefined) {
		options.push(`height: ${params.height}`);
	}

	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		options.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
	return `sticky('${content}'${optionsStr})`;
}

/**
 * Generate node call
 */
function generateNodeCall(node: SemanticNode, ctx: GenerationContext): string {
	if (isStickyNote(node.type)) {
		return generateStickyCall(node);
	}

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
 * Generate code for a branch that may be single, array (fan-out), or null
 */
function generateBranchCode(
	branch: CompositeNode | CompositeNode[] | null,
	ctx: GenerationContext,
): string {
	if (branch === null) return 'null';

	if (Array.isArray(branch)) {
		// Fan-out within branch - generate as array [branch1, branch2, ...]
		const branchesCode = branch.map((b) => generateComposite(b, ctx)).join(', ');
		return `[${branchesCode}]`;
	}

	return generateComposite(branch, ctx);
}

/**
 * Generate code for an IF branch
 */
function generateIfBranch(ifBranch: IfBranchCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	const trueBranchCode = generateBranchCode(ifBranch.trueBranch, innerCtx);
	const falseBranchCode = generateBranchCode(ifBranch.falseBranch, innerCtx);

	// Use variable reference if IF node is already declared as a variable
	// ifBranch expects flat config { name?, version?, parameters?, ... }, not { type, config: {...} }
	const config = generateFlatNodeOrVarRef(ifBranch.ifNode, ctx);

	return `ifBranch([${trueBranchCode}, ${falseBranchCode}], ${config})`;
}

/**
 * Generate code for a switch case
 */
function generateSwitchCase(switchCase: SwitchCaseCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// Use generateBranchCode to handle fan-out within each case
	const casesCode = switchCase.cases.map((c) => generateBranchCode(c, innerCtx)).join(', ');

	// Use variable reference if switch node is already declared as a variable
	// switchCase expects flat config { name?, version?, parameters?, ... }, not { type, config: {...} }
	const config = generateFlatNodeOrVarRef(switchCase.switchNode, ctx);

	return `switchCase([${casesCode}], ${config})`;
}

/**
 * Generate code for a merge
 */
function generateMerge(merge: MergeCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	const branchesCode = merge.branches.map((b) => generateComposite(b, innerCtx)).join(', ');

	// Use variable reference if merge node is already declared as a variable
	// merge expects flat config { name?, version?, parameters?, ... }, not { type, config: {...} }
	const config = generateFlatNodeOrVarRef(merge.mergeNode, ctx);

	return `merge([${branchesCode}], ${config})`;
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
 * Generate code for split in batches
 */
function generateSplitInBatches(sib: SplitInBatchesCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };
	// Use variable reference if SIB node is already declared as a variable
	// splitInBatches expects flat config { name?, version?, parameters?, ... }, not { type, config: {...} }
	const config = generateFlatNodeOrVarRef(sib.sibNode, ctx);

	let code = `splitInBatches(${config})`;

	if (sib.doneChain) {
		const doneCode = generateBranchCode(sib.doneChain, innerCtx);
		code += `\n${getIndent(ctx)}.done().then(${doneCode})`;
	}

	if (sib.loopChain) {
		const loopCode = generateBranchCode(sib.loopChain, innerCtx);
		code += `\n${getIndent(ctx)}.each().then(${loopCode})`;

		// Check if loop chain ends with cycle back
		if (branchEndsWithVarRef(sib.loopChain)) {
			code += `.loop()`;
		}
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

	// Generate all target branches
	const targetsCode = fanOut.targets
		.map((target) => generateComposite(target, innerCtx))
		.join(',\n' + getIndent(innerCtx));

	// Return with parallel .then([...]) syntax
	return `${sourceCode}\n${getIndent(ctx)}.then([\n${getIndent(innerCtx)}${targetsCode}])`;
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
		case 'fanOut':
			return generateFanOut(node, ctx);
	}
}

/**
 * Generate variable name from node name
 */
function toVarName(nodeName: string): string {
	let varName = nodeName
		.replace(/[^a-zA-Z0-9]/g, '_')
		.replace(/^(\d)/, '_$1')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.replace(/^([A-Z])/, (c) => c.toLowerCase());

	// Avoid reserved keywords
	if (RESERVED_KEYWORDS.has(varName)) {
		varName = varName + '_node';
	}

	return varName;
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
 * Flatten a composite tree into workflow-level calls.
 * Returns array of [method, code] tuples where method is 'add' or 'then'.
 */
function flattenToWorkflowCalls(
	root: CompositeNode,
	ctx: GenerationContext,
): Array<[string, string]> {
	const calls: Array<[string, string]> = [];

	if (root.kind === 'chain') {
		// Chain: first node is .add(), rest are .then()
		for (let i = 0; i < root.nodes.length; i++) {
			const node = root.nodes[i];
			const method = i === 0 ? 'add' : 'then';
			const code = generateComposite(node, ctx);
			calls.push([method, code]);
		}
	} else {
		// Single node: just .add()
		calls.push(['add', generateComposite(root, ctx)]);
	}

	return calls;
}

/**
 * Generate SDK code from a composite tree
 *
 * @param tree - The composite tree
 * @param json - Original workflow JSON (for metadata)
 * @returns Generated SDK code
 */
export function generateCode(
	tree: CompositeTree,
	json: WorkflowJSON,
	graph: SemanticGraph,
): string {
	const ctx: GenerationContext = {
		indent: 0,
		generatedVars: new Set(),
		variableNodes: tree.variables,
		graph,
	};

	const lines: string[] = [];

	// Generate variable declarations first
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

	lines.push(`return workflow('${workflowId}', '${workflowName}'${settingsStr})`);

	// Generate each root, flattening chains to workflow-level calls
	ctx.indent = 1;
	for (const root of tree.roots) {
		const calls = flattenToWorkflowCalls(root, ctx);
		for (const [method, code] of calls) {
			lines.push(`  .${method}(${code})`);
		}
	}

	return lines.join('\n');
}
