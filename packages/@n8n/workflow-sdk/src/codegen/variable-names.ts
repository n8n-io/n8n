/**
 * Variable name utilities for code generation
 */

/**
 * Reserved keywords that cannot be used as variable names
 */
export const RESERVED_KEYWORDS = new Set([
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
	// Dangerous globals (blocked by AST interpreter)
	'eval',
	'Function',
	'require',
	'process',
	'global',
	'globalThis',
	'window',
	'setTimeout',
	'setInterval',
	'setImmediate',
	'clearTimeout',
	'clearInterval',
	'clearImmediate',
	'module',
	'exports',
	'Buffer',
	'Reflect',
	'Proxy',
]);

/**
 * Context interface for variable name generation
 * (subset of GenerationContext from code-generator.ts)
 */
export interface VarNameContext {
	nodeNameToVarName: Map<string, string>;
	usedVarNames: Set<string>;
}

/**
 * Generate variable name from node name
 */
export function toVarName(nodeName: string): string {
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
export function getVarName(nodeName: string, ctx: VarNameContext): string {
	if (ctx.nodeNameToVarName.has(nodeName)) {
		return ctx.nodeNameToVarName.get(nodeName)!;
	}
	return toVarName(nodeName);
}

/**
 * Generate a unique variable name for a node, avoiding collisions.
 * Tracks used names and appends a counter if needed.
 */
export function getUniqueVarName(nodeName: string, ctx: VarNameContext): string {
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
