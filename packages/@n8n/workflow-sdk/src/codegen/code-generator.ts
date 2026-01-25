/**
 * Code Generator
 *
 * Generates LLM-friendly SDK code from a composite tree.
 */

import type { WorkflowJSON } from '../types/base';
import type { SemanticGraph, SemanticNode, AiConnectionType } from './types';
import { getCompositeType } from './semantic-registry';
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
} from './composite-tree';

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
	builderSetupStatements: string[]; // Builder setup statements (ifElse, switchCase, merge)
	mergeBuilders: Map<string, string>; // Maps merge node names to their builder variable names
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
	// JavaScript reserved words
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
	// JavaScript literals
	'null',
	'true',
	'false',
	'undefined',
	// SDK functions
	'workflow',
	'trigger',
	'node',
	'merge',
	'ifElse',
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
	ai_reranker: 'reranker',
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
	ai_reranker: 'reranker',
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
		configParts.push(`parameters: ${formatValue(subnodeNode.json.parameters)}`);
	}

	if (subnodeNode.json.credentials) {
		configParts.push(`credentials: ${formatValue(subnodeNode.json.credentials)}`);
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
		parts.push(`config: {}`);
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
		parts.push(`${innerIndent}config: { ${configParts.join(', ')} }`);
	} else {
		parts.push(`${innerIndent}config: {}`);
	}

	return `{\n${parts.join(',\n')}\n${indent}}`;
}

/**
 * Generate flat config object for composite functions (ifElse, merge, switchCase, splitInBatches).
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

	// ALWAYS include name for composite nodes (ifElse, merge, switchCase, splitInBatches)
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
 * Used by splitInBatches.
 */
function generateFlatNodeOrVarRef(node: SemanticNode, ctx: GenerationContext): string {
	const nodeName = node.json.name;
	if (nodeName && ctx.variableNodes.has(nodeName)) {
		return getVarName(nodeName, ctx);
	}
	return generateFlatNodeConfig(node);
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
 * Generate code for a leaf node, using variable reference if the node is declared as a variable
 */
function generateLeafCode(leaf: LeafNode, ctx: GenerationContext): string {
	const nodeName = leaf.node.json.name;

	// Check if this is a merge node with a builder - use the builder instead
	if (nodeName && ctx.mergeBuilders.has(nodeName)) {
		return ctx.mergeBuilders.get(nodeName)!;
	}

	if (nodeName && ctx.variableNodes.has(nodeName)) {
		// Use variable reference for nodes that are declared as variables
		return getVarName(nodeName, ctx);
	}
	return generateNodeCall(leaf.node, ctx);
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
 *
 * Special handling for merge nodes with branches:
 * When a chain contains [A, Merge with branches [B, C], D], the actual topology is:
 *   A → [B → Merge.input(0), C → Merge.input(1)] → D
 * So we generate: A.then([B.then(merge.input(0)), C.then(merge.input(1))])
 * And the downstream (D) is handled separately via mergeDownstreams.
 */
/**
 * Get the name of a node from a composite node
 */
function getCompositeNodeName(node: CompositeNode): string | null {
	if (node.kind === 'leaf') {
		return node.node.json.name;
	}
	if (node.kind === 'varRef') {
		return node.nodeName;
	}
	if (node.kind === 'chain' && node.nodes.length > 0) {
		// For chains, return the last node's name (the one that connects to merge)
		return getCompositeNodeName(node.nodes[node.nodes.length - 1]);
	}
	return null;
}

/**
 * Find which merge input index a node connects to
 */
function findMergeInputIndex(nodeName: string, mergeNode: SemanticNode): number | null {
	for (const [inputSlotKey, sources] of mergeNode.inputSources) {
		for (const source of sources) {
			if (source.from === nodeName) {
				return extractInputIndex(inputSlotKey);
			}
		}
	}
	return null;
}

function generateChain(chain: ChainNode, ctx: GenerationContext): string {
	const parts: string[] = [];

	for (let i = 0; i < chain.nodes.length; i++) {
		const node = chain.nodes[i];

		// Special handling for merge nodes with branches
		if (i > 0 && node.kind === 'merge') {
			const mergeComposite = node as MergeCompositeNode;
			const builderVarName = generateMerge(mergeComposite, ctx, true);

			// Get the previous node's name in the chain
			const prevNode = chain.nodes[i - 1];
			const prevNodeName = getCompositeNodeName(prevNode);

			// Check if the previous node is a DIRECT merge input
			// (i.e., the chain contains [... → prevNode → merge] where prevNode feeds into merge)
			if (prevNodeName) {
				const inputIndex = findMergeInputIndex(prevNodeName, mergeComposite.mergeNode);
				if (inputIndex !== null) {
					// Previous node IS a direct merge input - just connect to that input
					// The chain already includes nodes leading to the merge, so just connect
					parts.push(`.then(${builderVarName}.input(${inputIndex}))`);
					// Skip rest of chain - merge downstream handled separately
					break;
				}
			}

			// Previous node is NOT a direct merge input - this means there are
			// intermediate nodes between the chain's previous node and the merge
			// (workflow 5745 pattern). Generate fan-out to those intermediate branches.
			if (mergeComposite.branches.length > 0) {
				const branchCodes: string[] = [];
				for (let j = 0; j < mergeComposite.branches.length; j++) {
					const branch = mergeComposite.branches[j];
					const branchCode = generateComposite(branch, ctx);
					branchCodes.push(`${branchCode}.then(${builderVarName}.input(${j}))`);
				}

				if (branchCodes.length === 1) {
					parts.push(`.then(${branchCodes[0]})`);
				} else {
					parts.push(`.then([${branchCodes.join(', ')}])`);
				}

				// Skip rest of chain - merge downstream handled separately
				break;
			}
		}

		// Special handling for varRef to merge nodes
		// This happens when a parallel branch has already built the merge composite,
		// and this branch just has a reference to it
		if (i > 0 && node.kind === 'varRef') {
			const varRef = node as VariableReference;
			// Check if this varRef points to a merge node
			const referencedNode = ctx.graph.nodes.get(varRef.nodeName);
			if (referencedNode && getCompositeType(referencedNode.type) === 'merge') {
				// This is a reference to a merge node
				// Get the previous node's name to find which input it connects to
				const prevNode = chain.nodes[i - 1];
				const prevNodeName = getCompositeNodeName(prevNode);

				if (prevNodeName) {
					const inputIndex = findMergeInputIndex(prevNodeName, referencedNode);
					if (inputIndex !== null) {
						// Get the builder variable name for this merge
						const builderVarName = ctx.mergeBuilders.get(varRef.nodeName) ?? varRef.varName;
						parts.push(`.then(${builderVarName}.input(${inputIndex}))`);
						// Skip rest of chain
						break;
					}
				}
			}
		}

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
 * Check if a node is an IF or Switch type (has non-default outputs like falseBranch)
 */
function isIfOrSwitchNode(node: SemanticNode): boolean {
	const compositeType = getCompositeType(node.type);
	return compositeType === 'ifElse' || compositeType === 'switchCase';
}

/**
 * Extract numeric index from semantic input slot name (e.g., 'branch0' -> 0, 'input1' -> 1)
 */
function extractInputIndex(inputSlotKey: string): number | null {
	// Try to extract the numeric suffix from slot names like 'branch0', 'input1', etc.
	const match = inputSlotKey.match(/(\d+)$/);
	if (match) {
		return parseInt(match[1], 10);
	}
	// Fallback: try parsing as a number directly
	const parsed = parseInt(inputSlotKey, 10);
	return isNaN(parsed) ? null : parsed;
}

/**
 * Check if a merge input branch should be skipped because it's an IF/Switch node
 * whose connection is handled by its builder (onTrue/onFalse/onCase)
 *
 * The merge should only generate .then() for branches that connect from the default output.
 * IF/Switch nodes connecting from non-default outputs (falseBranch, case1, etc.) should be
 * handled by their respective builders.
 *
 * @param branchNodeName - The name of the branch node connecting to merge
 * @param mergeInputIndex - The merge input index this branch connects to
 * @param mergeNode - The merge node
 * @param ctx - Generation context
 * @returns true if this branch should be skipped in merge generation
 */
function shouldSkipMergeBranch(
	branchNodeName: string,
	mergeInputIndex: number,
	mergeNode: SemanticNode,
	ctx: GenerationContext,
): boolean {
	const branchNode = ctx.graph.nodes.get(branchNodeName);
	if (!branchNode || !isIfOrSwitchNode(branchNode)) {
		return false;
	}

	// Search through all merge inputs to find where this branch connects
	// Input slot keys are semantic names like 'branch0', 'branch1', etc.
	for (const [inputSlotKey, sources] of mergeNode.inputSources) {
		const slotIndex = extractInputIndex(inputSlotKey);
		if (slotIndex !== mergeInputIndex) continue;

		for (const source of sources) {
			if (source.from === branchNodeName) {
				// If the connection comes from a non-default output (falseBranch, case1, etc.),
				// the IF/Switch builder will handle it via onFalse/onCase
				// Default outputs are 'trueBranch' (for IF) and 'case0' (for Switch)
				if (source.outputSlot !== 'trueBranch' && source.outputSlot !== 'case0') {
					return true;
				}
			}
		}
	}

	return false;
}

/**
 * Get the merge input index that a specific node connects to from a specific output slot
 * Used by IF/Switch builders to generate correct merge_builder.input(n) calls
 */
function getMergeInputForOutput(
	sourceNodeName: string,
	outputSlot: string,
	mergeNode: SemanticNode,
): number | null {
	// Search through all merge inputs to find where this source/output connects
	for (const [inputSlotKey, sources] of mergeNode.inputSources) {
		for (const source of sources) {
			if (source.from === sourceNodeName && source.outputSlot === outputSlot) {
				return extractInputIndex(inputSlotKey);
			}
		}
	}
	return null;
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
 * Generate code for a merge branch that ends with .then(mergeBuilder.input(n))
 * Handles fan-out branches where each element needs to end at the merge input
 */
function generateBranchWithMergeInput(
	branch: CompositeNode,
	mergeBuilderVarName: string,
	inputIndex: number,
	ctx: GenerationContext,
): string {
	// Check if this is a fan-out branch
	if (branch.kind === 'fanOut') {
		const fanOut = branch as FanOutCompositeNode;
		const sourceCode = generateComposite(fanOut.sourceNode, ctx);

		// Each target in the fan-out should end at the merge input
		const targetCodes = fanOut.targets.map((target) => {
			const targetCode = generateComposite(target, ctx);
			return `${targetCode}.then(${mergeBuilderVarName}.input(${inputIndex}))`;
		});

		// Return the source fanning out to targets that end at merge inputs
		return `${sourceCode}.then([${targetCodes.join(', ')}]);`;
	}

	// Single branch - just append .then(mergeBuilder.input(n))
	const branchCode = generateComposite(branch, ctx);
	return `${branchCode}.then(${mergeBuilderVarName}.input(${inputIndex}));`;
}

/**
 * Generate branch code that correctly handles merge input connections.
 * When a branch ends at a merge node, generates merge_builder.input(n) instead of merge_builder.
 *
 * @param branch - The branch composite node
 * @param sourceNodeName - The source node name (e.g., IF node)
 * @param outputSlot - The output slot name (e.g., 'falseBranch')
 * @param ctx - Generation context
 * @returns Generated code for the branch
 */
function generateBranchCodeWithMergeInput(
	branch: CompositeNode | CompositeNode[] | null,
	sourceNodeName: string,
	outputSlot: string,
	ctx: GenerationContext,
): string {
	if (branch === null) return 'null';

	if (Array.isArray(branch)) {
		// Fan-out within branch - handle each branch
		const branchesCode = branch.map((b) =>
			generateBranchCodeWithMergeInput(b, sourceNodeName, outputSlot, ctx),
		);
		return `[${branchesCode.join(', ')}]`;
	}

	// Check if this branch is a merge node
	if (branch.kind === 'merge') {
		const mergeNode = (branch as MergeCompositeNode).mergeNode;
		const mergeName = mergeNode.json.name;

		// First, ensure the merge builder is generated and registered
		// This is necessary because the merge might not have been processed yet
		const generatedMergeCode = generateComposite(branch, ctx);

		// Now look up the registered builder name
		const mergeBuilderVarName = mergeName ? ctx.mergeBuilders.get(mergeName) : undefined;

		if (mergeBuilderVarName) {
			// Find which merge input this source/output connects to
			const inputIndex = getMergeInputForOutput(sourceNodeName, outputSlot, mergeNode);
			if (inputIndex !== null) {
				return `${mergeBuilderVarName}.input(${inputIndex})`;
			}
		}

		// Fallback to the generated code if we couldn't determine the input
		return generatedMergeCode;
	}

	// Check if branch is a chain ending at a merge
	if (branch.kind === 'chain') {
		const chainNode = branch as ChainNode;
		const lastNode = chainNode.nodes[chainNode.nodes.length - 1];
		if (lastNode?.kind === 'merge') {
			const mergeNode = (lastNode as MergeCompositeNode).mergeNode;
			const mergeName = mergeNode.json.name;

			// Generate the chain first to ensure merge builder is registered
			// We need all nodes to be processed
			const chainCode = generateComposite(branch, ctx);

			// Now look up the registered builder name
			const mergeBuilderVarName = mergeName ? ctx.mergeBuilders.get(mergeName) : undefined;

			if (mergeBuilderVarName) {
				// Find which merge input this source/output connects to
				const inputIndex = getMergeInputForOutput(sourceNodeName, outputSlot, mergeNode);
				if (inputIndex !== null) {
					// Generate all nodes except the last (merge), then chain to merge input
					const nodesBeforeMerge = chainNode.nodes.slice(0, -1);
					if (nodesBeforeMerge.length > 0) {
						const nodesCode = nodesBeforeMerge.map((n) => generateComposite(n, ctx)).join('.then(');
						const closingParens = ')'.repeat(nodesBeforeMerge.length - 1);
						return `${nodesCode}${closingParens}.then(${mergeBuilderVarName}.input(${inputIndex}))`;
					}
					return `${mergeBuilderVarName}.input(${inputIndex})`;
				}
			}

			// Fallback to the generated chain code
			return chainCode;
		}
	}

	// Default: use regular branch code generation
	return generateComposite(branch, ctx);
}

/**
 * Generate code for an IF branch using builder syntax
 */
function generateIfElse(ifElse: IfElseCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// Get the IF node reference
	const ifNodeRef = getVarRefOrInlineNode(ifElse.ifNode, ctx);
	const ifNodeName = ifElse.ifNode.json.name ?? '';

	// Generate a unique builder variable name
	const builderVarName = getUniqueVarName(`${ifElse.ifNode.json.name ?? 'if'}_builder`, ctx);

	// Generate builder declaration
	ctx.builderSetupStatements.push(`const ${builderVarName} = ifElse(${ifNodeRef});`);

	// Generate branch configuration statements
	// Only generate branches that are not null
	// Use generateBranchCodeWithMergeInput to handle merge connections correctly
	if (ifElse.trueBranch !== null) {
		const trueBranchCode = generateBranchCodeWithMergeInput(
			ifElse.trueBranch,
			ifNodeName,
			'trueBranch',
			innerCtx,
		);
		ctx.builderSetupStatements.push(`${builderVarName}.onTrue(${trueBranchCode});`);
	}

	if (ifElse.falseBranch !== null) {
		const falseBranchCode = generateBranchCodeWithMergeInput(
			ifElse.falseBranch,
			ifNodeName,
			'falseBranch',
			innerCtx,
		);
		ctx.builderSetupStatements.push(`${builderVarName}.onFalse(${falseBranchCode});`);
	}

	// Return the builder variable name for use in the workflow chain
	return builderVarName;
}

/**
 * Generate code for a switch case using builder syntax
 */
function generateSwitchCase(switchCase: SwitchCaseCompositeNode, ctx: GenerationContext): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };

	// Get the Switch node reference
	const switchNodeRef = getVarRefOrInlineNode(switchCase.switchNode, ctx);

	// If no cases, just return the switch node reference (don't wrap in switchCase())
	if (switchCase.cases.length === 0) {
		return switchNodeRef;
	}

	// Generate a unique builder variable name
	const builderVarName = getUniqueVarName(
		`${switchCase.switchNode.json.name ?? 'switch'}_builder`,
		ctx,
	);

	// Generate builder declaration
	ctx.builderSetupStatements.push(`const ${builderVarName} = switchCase(${switchNodeRef});`);

	// Generate case configuration statements
	switchCase.cases.forEach((c, i) => {
		if (c !== null) {
			const caseCode = generateBranchCode(c, innerCtx);
			ctx.builderSetupStatements.push(`${builderVarName}.onCase(${i}, ${caseCode});`);
		}
	});

	// Return the builder variable name for use in the workflow chain
	return builderVarName;
}

/**
 * Generate code for a merge using the builder pattern
 * Generates: const myMerge = merge({ name: ..., parameters: ... });
 * And optionally branches that end with .then(myMerge.input(n))
 *
 * @param skipBranchStatements - If true, skip generating branch setup statements
 *   (used when branches are handled inline in the workflow chain)
 */
function generateMerge(
	mergeNode: MergeCompositeNode,
	ctx: GenerationContext,
	skipBranchStatements = false,
): string {
	const innerCtx = { ...ctx, indent: ctx.indent + 1 };
	const mergeName = mergeNode.mergeNode.json.name;

	// Check if this merge was already declared as a variable (in generateVariableDeclarations)
	// If so, use the existing variable name instead of creating a duplicate
	const existingBuilder = mergeName ? ctx.mergeBuilders.get(mergeName) : undefined;
	if (existingBuilder) {
		// Merge was already declared - just return the existing variable name
		// Still need to generate branch statements though
		if (!skipBranchStatements && mergeNode.branches.length > 0) {
			generateMergeBranchStatements(mergeNode, existingBuilder, innerCtx, ctx);
		}
		return existingBuilder;
	}

	// Generate a unique builder variable name
	const builderVarName = getUniqueVarName(`${mergeName ?? 'merge'}_builder`, ctx);

	// Generate merge config
	const configParts: string[] = [];
	if (mergeName) {
		configParts.push(`name: '${escapeString(mergeName)}'`);
	}
	// Always include version to preserve decimal versions like 3.2
	if (mergeNode.mergeNode.json.typeVersion != null) {
		configParts.push(`version: ${mergeNode.mergeNode.json.typeVersion}`);
	}
	if (
		mergeNode.mergeNode.json.parameters &&
		Object.keys(mergeNode.mergeNode.json.parameters).length > 0
	) {
		configParts.push(`parameters: ${formatValue(mergeNode.mergeNode.json.parameters)}`);
	}
	const pos = mergeNode.mergeNode.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	const configStr = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';

	// Generate builder declaration
	ctx.builderSetupStatements.push(`const ${builderVarName} = merge(${configStr});`);

	// Register this merge builder so LeafNodes can use it instead of the raw node variable
	if (mergeName) {
		ctx.mergeBuilders.set(mergeName, builderVarName);
	}

	// Generate branches as separate setup statements, each ending with .then(builderVarName.input(n))
	// Skip if branches are handled inline (e.g., in workflow chain fan-out)
	// Also skip IF/Switch branches that connect from non-default outputs (handled by their builders)
	if (!skipBranchStatements && mergeNode.branches.length > 0) {
		generateMergeBranchStatements(mergeNode, builderVarName, innerCtx, ctx);
	}

	// Return the builder variable name for use in the workflow chain
	return builderVarName;
}

/**
 * Generate branch statements for a merge node
 * Extracted to allow reuse when merge was already declared as a variable
 */
function generateMergeBranchStatements(
	mergeNode: MergeCompositeNode,
	builderVarName: string,
	innerCtx: GenerationContext,
	ctx: GenerationContext,
): void {
	// Iterate through actual merge inputs to get correct input indices
	// Input slot keys are semantic names like 'branch0', 'branch1', etc.
	for (const [inputSlotKey, sources] of mergeNode.mergeNode.inputSources) {
		const inputIndex = extractInputIndex(inputSlotKey);
		if (inputIndex === null) continue;

		for (const source of sources) {
			// Find the branch for this source
			// Note: varRef.varName is the camelCase variable name, source.from is the original node name
			const sourceVarName = toVarName(source.from);
			const branchForSource = mergeNode.branches.find((b) => {
				if (b.kind === 'varRef') {
					return (b as VariableReference).varName === sourceVarName;
				}
				if (b.kind === 'leaf') {
					return (b as LeafNode).node.json.name === source.from;
				}
				return false;
			});

			if (!branchForSource) continue;

			// Check if this is an IF/Switch branch connecting from a non-default output
			// If so, skip it - the IF/Switch builder will handle the connection via onTrue/onFalse/onCase
			if (shouldSkipMergeBranch(source.from, inputIndex, mergeNode.mergeNode, ctx)) {
				continue;
			}

			// Generate the branch connection
			const branchCode = generateBranchWithMergeInput(
				branchForSource,
				builderVarName,
				inputIndex,
				innerCtx,
			);
			ctx.builderSetupStatements.push(branchCode);
		}
	}
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
	}
}

/**
 * Generate variable name from node name
 */
function toVarName(nodeName: string): string {
	let varName = nodeName
		.replace(/[^a-zA-Z0-9]/g, '_')
		.replace(/_+/g, '_')
		.replace(/_$/g, '') // Only remove trailing underscore, not leading
		.replace(/^([A-Z])/, (c) => c.toLowerCase());

	// If starts with digit, prefix with underscore
	if (/^\d/.test(varName)) {
		varName = '_' + varName;
	}

	// Remove leading underscore only if followed by letter (not digit)
	// This preserves _2nd... but removes _Foo...
	if (/^_[a-zA-Z]/.test(varName)) {
		varName = varName.slice(1);
	}

	// Avoid reserved keywords
	if (RESERVED_KEYWORDS.has(varName)) {
		varName = varName + '_node';
	}

	return varName;
}

/**
 * Get the variable name for a node, looking up in the context's mapping.
 * If the node name has been assigned a variable name, returns that.
 * Otherwise returns the base variable name (which may collide).
 */
function getVarName(nodeName: string, ctx: GenerationContext): string {
	if (ctx.nodeNameToVarName.has(nodeName)) {
		return ctx.nodeNameToVarName.get(nodeName)!;
	}
	return toVarName(nodeName);
}

/**
 * Generate a unique variable name for a node, avoiding collisions.
 * Tracks used names and appends a counter if needed.
 */
function getUniqueVarName(nodeName: string, ctx: GenerationContext): string {
	// If we already assigned a name for this node, return it
	if (ctx.nodeNameToVarName.has(nodeName)) {
		return ctx.nodeNameToVarName.get(nodeName)!;
	}

	const baseVarName = toVarName(nodeName);
	let varName = baseVarName;
	let counter = 1;

	// Keep incrementing counter until we find an unused name
	while (ctx.usedVarNames.has(varName)) {
		varName = `${baseVarName}${counter}`;
		counter++;
	}

	// Record the mapping and mark as used
	ctx.usedVarNames.add(varName);
	ctx.nodeNameToVarName.set(nodeName, varName);

	return varName;
}

/**
 * Generate merge() builder call for a merge node variable declaration
 */
function generateMergeBuilderCall(node: SemanticNode): string {
	const configParts: string[] = [];

	if (node.json.name) {
		configParts.push(`name: '${escapeString(node.json.name)}'`);
	}
	if (node.json.typeVersion != null) {
		configParts.push(`version: ${node.json.typeVersion}`);
	}
	if (node.json.parameters && Object.keys(node.json.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(node.json.parameters)}`);
	}
	const pos = node.json.position;
	if (pos && (pos[0] !== 0 || pos[1] !== 0)) {
		configParts.push(`position: [${pos[0]}, ${pos[1]}]`);
	}

	const configStr = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';
	return `merge(${configStr})`;
}

/**
 * Generate variable declarations
 * Merge nodes are declared as merge() builders instead of node() calls
 * to avoid duplicate node creation when they're also used in merge composites.
 */
function generateVariableDeclarations(
	variables: Map<string, SemanticNode>,
	ctx: GenerationContext,
): string {
	const declarations: string[] = [];

	for (const [nodeName, node] of variables) {
		const varName = getUniqueVarName(nodeName, ctx);

		// Merge nodes are declared as merge() builders instead of node() calls
		// This ensures consistency - the same merge() call is used whether the node
		// is a standalone variable or part of a merge composite
		const compositeType = getCompositeType(node.type);
		if (compositeType === 'merge') {
			const mergeCall = generateMergeBuilderCall(node);
			declarations.push(`const ${varName} = ${mergeCall};`);
			// Register this merge builder so it's used consistently
			ctx.mergeBuilders.set(nodeName, varName);
		} else {
			const nodeCall = generateNodeCall(node, ctx);
			declarations.push(`const ${varName} = ${nodeCall};`);
		}
		ctx.generatedVars.add(nodeName);
	}

	return declarations.join('\n');
}

/**
 * Flatten a composite tree into workflow-level calls.
 * Returns array of [method, code] tuples where method is 'add', 'then', or 'connect'.
 */
function flattenToWorkflowCalls(
	root: CompositeNode,
	ctx: GenerationContext,
): Array<[string, string]> {
	const calls: Array<[string, string]> = [];

	if (root.kind === 'explicitConnections') {
		// Explicit connections pattern: generate .add() for each node, then .connect() for each connection
		const explicitConns = root as ExplicitConnectionsNode;

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
		// Chain: first node is .add(), rest are .then()
		for (let i = 0; i < root.nodes.length; i++) {
			const node = root.nodes[i];
			const method = i === 0 ? 'add' : 'then';

			// Special handling for merge in .then() position:
			// Generate fan-out to branches, then add merge separately
			if (method === 'then' && node.kind === 'merge') {
				const mergeNode = node as MergeCompositeNode;
				const mergeCalls = generateMergeChainCalls(mergeNode, ctx);
				calls.push(...mergeCalls);
			} else {
				const code = generateComposite(node, ctx);
				calls.push([method, code]);
			}
		}
	} else {
		// Single node: just .add()
		calls.push(['add', generateComposite(root, ctx)]);
	}

	return calls;
}

/**
 * Generate workflow calls for a merge composite in a chain.
 * Returns: [['then', '[branch1.then(merge.input(0)), ...]'], ['add', 'merge_builder']]
 */
function generateMergeChainCalls(
	mergeNode: MergeCompositeNode,
	ctx: GenerationContext,
): Array<[string, string]> {
	const calls: Array<[string, string]> = [];

	// Generate the merge builder, skipping branch statements since we handle them inline
	const builderVarName = generateMerge(mergeNode, ctx, true);

	// If there are branches, generate fan-out to branches with merge input connections
	if (mergeNode.branches.length > 0) {
		const branchCodes: string[] = [];
		for (let i = 0; i < mergeNode.branches.length; i++) {
			const branch = mergeNode.branches[i];
			const branchCode = generateComposite(branch, ctx);
			branchCodes.push(`${branchCode}.then(${builderVarName}.input(${i}))`);
		}

		// Generate fan-out: .then([branch1.then(merge.input(0)), branch2.then(merge.input(1))])
		if (branchCodes.length === 1) {
			calls.push(['then', branchCodes[0]]);
		} else {
			calls.push(['then', `[${branchCodes.join(', ')}]`]);
		}
	}

	// Add the merge builder to ensure it's in the workflow
	calls.push(['add', builderVarName]);

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
		nodeNameToVarName: new Map(),
		usedVarNames: new Set(),
		subnodeVariables: new Map(),
		builderSetupStatements: [],
		mergeBuilders: new Map(),
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

	// Generate each root, flattening chains to workflow-level calls
	// This must happen BEFORE adding builder statements to lines,
	// as it populates ctx.builderSetupStatements
	ctx.indent = 1;
	const workflowCalls: string[] = [];
	for (const root of tree.roots) {
		const calls = flattenToWorkflowCalls(root, ctx);
		for (const [method, code] of calls) {
			workflowCalls.push(`  .${method}(${code})`);
		}
	}

	// Add builder setup statements (ifElse, switchCase, merge builders)
	// These come after node declarations but before the workflow chain
	if (ctx.builderSetupStatements.length > 0) {
		lines.push(...ctx.builderSetupStatements);
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

	// Add workflow calls and return statement
	if (workflowCalls.length > 0) {
		lines.push('');
		lines.push('return wf');
		lines.push(...workflowCalls);
	} else {
		lines.push('');
		lines.push('return wf');
	}

	return lines.join('\n');
}
