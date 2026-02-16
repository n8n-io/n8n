/**
 * Security validators for the AST interpreter.
 * Defines allowed SDK functions, methods, and detects dangerous patterns.
 */
import type { Node, CallExpression, MemberExpression } from 'estree';

import { SecurityError, UnsupportedNodeError } from './errors';

/**
 * Allowlist of SDK functions that can be called at the top level.
 */
export const ALLOWED_SDK_FUNCTIONS = new Set([
	// Core workflow builders
	'workflow',
	'node',
	'trigger',
	'sticky',
	'placeholder',
	'newCredential',

	// Control flow
	'ifElse',
	'switchCase',
	'merge',
	'splitInBatches',
	'nextBatch',

	// AI/LangChain subnodes
	'languageModel',
	'memory',
	'tool',
	'outputParser',
	'embedding',
	'embeddings',
	'vectorStore',
	'retriever',
	'documentLoader',
	'textSplitter',
	'reranker',

	// Utility
	'fromAi', // NEW: replaces ($) => $.fromAi() pattern
]);

/**
 * Subset of SDK functions whose names can be auto-renamed when used as variables.
 * Only subnode builder names are auto-renameable — core builders and control flow still throw.
 */
export const AUTO_RENAMEABLE_SDK_FUNCTIONS = new Set([
	'languageModel',
	'memory',
	'tool',
	'outputParser',
	'embedding',
	'embeddings',
	'vectorStore',
	'retriever',
	'documentLoader',
	'textSplitter',
	'reranker',
]);

/**
 * Check if an identifier is an auto-renameable SDK function.
 */
export function isAutoRenameableSDKFunction(name: string): boolean {
	return AUTO_RENAMEABLE_SDK_FUNCTIONS.has(name);
}

/**
 * Allowlist of method names that can be called on SDK objects.
 */
export const ALLOWED_METHODS = new Set([
	// Workflow builder methods
	'add',
	'to',

	// Node builder methods
	'input',
	'output',
	'onError',

	// Control flow methods
	'onTrue',
	'onFalse',
	'onCase',
	'onEachBatch',
	'onDone',

	// Connection methods
	'connect',

	// Internal methods
	'toJSON',
	'validate',
]);

/**
 * Dangerous global identifiers that should be rejected.
 */
const DANGEROUS_GLOBALS = new Set([
	'eval',
	'Function',
	'require',
	'import',
	'process',
	'global',
	'globalThis',
	'window',
	'document',
	'setTimeout',
	'setInterval',
	'setImmediate',
	'clearTimeout',
	'clearInterval',
	'clearImmediate',
	'__dirname',
	'__filename',
	'module',
	'exports',
	'Buffer',
	'Reflect',
	'Proxy',

	// Built-in constructors (defense-in-depth)
	'Object',
	'Array',
	'String',
	'Number',
	'Boolean',
	'Symbol',
	'BigInt',

	// Built-in objects
	'JSON',
	'Math',
	'Date',
	'RegExp',

	// Collection/async types
	'Promise',
	'WeakRef',
	'WeakMap',
	'WeakSet',
	'Map',
	'Set',

	// Binary data
	'ArrayBuffer',
	'SharedArrayBuffer',
	'DataView',
	'Atomics',

	// WASM
	'WebAssembly',

	// Runtime APIs
	'fetch',
	'XMLHttpRequest',
	'queueMicrotask',
	'structuredClone',

	// Error constructors
	'Error',
	'TypeError',
	'RangeError',

	// Logging
	'console',
]);

/**
 * Node types that are allowed in SDK code.
 */
const ALLOWED_NODE_TYPES = new Set([
	// Program structure
	'Program',

	// Declarations
	'VariableDeclaration',
	'VariableDeclarator',

	// Statements
	'ExpressionStatement',
	'ExportDefaultDeclaration',

	// Expressions
	'CallExpression',
	'MemberExpression',
	'ObjectExpression',
	'ArrayExpression',
	'Identifier',
	'Literal',
	'TemplateLiteral',
	'TemplateElement',
	'SpreadElement',
	'Property',

	// Assignment (constrained to property assignment only)
	'AssignmentExpression',

	// Operators (for simple expressions like array access)
	'UnaryExpression',
	'BinaryExpression',
	'LogicalExpression',
	'ConditionalExpression',
]);

/**
 * Node types that are explicitly forbidden (for better error messages).
 */
const FORBIDDEN_NODE_TYPES: Record<string, string> = {
	ArrowFunctionExpression:
		'Arrow functions are not allowed. Use fromAi() directly instead of ($) => $.fromAi()',
	FunctionExpression: 'Function expressions are not allowed in SDK code',
	FunctionDeclaration: 'Function declarations are not allowed in SDK code',
	ClassDeclaration: 'Class declarations are not allowed in SDK code',
	ClassExpression: 'Class expressions are not allowed in SDK code',
	ForStatement: 'For loops are not allowed in SDK code',
	ForInStatement: 'For-in loops are not allowed in SDK code',
	ForOfStatement: 'For-of loops are not allowed in SDK code',
	WhileStatement: 'While loops are not allowed in SDK code',
	DoWhileStatement: 'Do-while loops are not allowed in SDK code',
	TryStatement: 'Try-catch is not allowed in SDK code',
	ThrowStatement: 'Throw statements are not allowed in SDK code',
	WithStatement: 'With statements are not allowed in SDK code',
	UpdateExpression: 'Update expressions (++, --) are not allowed in SDK code',
	NewExpression: 'new expressions are not allowed. Use SDK factory functions instead.',
	ImportDeclaration: 'Import declarations are not allowed in SDK code',
	ImportExpression: 'Dynamic imports are not allowed in SDK code',
	ExportNamedDeclaration: 'Named exports are not allowed. Use export default only.',
	ExportAllDeclaration: 'Re-exports are not allowed in SDK code',
	AwaitExpression: 'Await expressions are not allowed in SDK code',
	YieldExpression: 'Yield expressions are not allowed in SDK code',
};

/**
 * Check if a node type is allowed.
 * @throws UnsupportedNodeError if the node type is not allowed
 */
export function validateNodeType(node: Node, sourceCode: string): void {
	if (FORBIDDEN_NODE_TYPES[node.type]) {
		throw new UnsupportedNodeError(
			`${node.type}: ${FORBIDDEN_NODE_TYPES[node.type]}`,
			node.loc ?? undefined,
			sourceCode,
		);
	}

	if (!ALLOWED_NODE_TYPES.has(node.type)) {
		throw new UnsupportedNodeError(node.type, node.loc ?? undefined, sourceCode);
	}
}

/**
 * Check if an identifier is a dangerous global.
 * @throws SecurityError if the identifier is dangerous
 */
export function validateIdentifier(
	name: string,
	_allowedVariables: Set<string>,
	node: Node,
	sourceCode: string,
): void {
	if (DANGEROUS_GLOBALS.has(name)) {
		throw new SecurityError(
			`Access to '${name}' is not allowed`,
			node.loc ?? undefined,
			sourceCode,
		);
	}
}

/**
 * Validate a function call expression.
 * @throws SecurityError if the call is dangerous
 */
export function validateCallExpression(node: CallExpression, sourceCode: string): void {
	// Check for dangerous patterns like eval("...")
	if (node.callee.type === 'Identifier') {
		const name = node.callee.name;
		if (name === 'eval') {
			throw new SecurityError('eval()', node.loc ?? undefined, sourceCode);
		}
		if (name === 'Function') {
			throw new SecurityError('Function()', node.loc ?? undefined, sourceCode);
		}
		if (name === 'require') {
			throw new SecurityError('require()', node.loc ?? undefined, sourceCode);
		}
	}

	// Check for dangerous patterns like global.constructor.constructor
	if (node.callee.type === 'MemberExpression') {
		const memberExpr = node.callee;
		if (memberExpr.property.type === 'Identifier' && memberExpr.property.name === 'constructor') {
			throw new SecurityError('constructor access', node.loc ?? undefined, sourceCode);
		}
	}
}

/**
 * Validate a member expression.
 * @throws SecurityError if the access is dangerous
 */
export function validateMemberExpression(node: MemberExpression, sourceCode: string): void {
	// Reject dynamic property access obj[expr] (computed access)
	// Allow obj.property (non-computed)
	if (node.computed) {
		// Allow simple literal keys like obj["key"] or obj[0]
		if (node.property.type !== 'Literal') {
			throw new SecurityError(
				'Dynamic property access is not allowed. Use static property names.',
				node.loc ?? undefined,
				sourceCode,
			);
		}
	}

	// Check for dangerous property names (both dot notation and literal keys)
	const propName =
		node.property.type === 'Identifier'
			? node.property.name
			: node.property.type === 'Literal' && typeof node.property.value === 'string'
				? node.property.value
				: undefined;

	if (
		propName !== undefined &&
		(propName === '__proto__' || propName === 'prototype' || propName === 'constructor')
	) {
		throw new SecurityError(
			`Access to '${propName}' is not allowed`,
			node.loc ?? undefined,
			sourceCode,
		);
	}
}

/**
 * Check if an identifier is an allowed SDK function.
 */
export function isAllowedSDKFunction(name: string): boolean {
	return ALLOWED_SDK_FUNCTIONS.has(name);
}

/**
 * Check if a method name is allowed.
 */
export function isAllowedMethod(name: string): boolean {
	return ALLOWED_METHODS.has(name);
}

/**
 * Safe subset of JSON methods available in SDK code.
 * Only stringify is permitted.
 */
const SAFE_JSON_METHODS: Record<string, (...args: unknown[]) => unknown> = {
	stringify: (...args: unknown[]) =>
		JSON.stringify(args[0], args[1] as undefined, args[2] as undefined),
};

/**
 * Check if a member expression is a safe JSON method call (e.g. JSON.stringify).
 * Returns the safe function if so, undefined otherwise.
 */
export function getSafeJSONMethod(
	objectName: string,
	methodName: string,
): ((...args: unknown[]) => unknown) | undefined {
	if (objectName !== 'JSON') return undefined;
	return SAFE_JSON_METHODS[methodName];
}

/**
 * Safe subset of string methods available in SDK code.
 */
const SAFE_STRING_METHODS: Record<string, (str: string, ...args: unknown[]) => unknown> = {
	repeat: (str: string, count: unknown) => str.repeat(count as number),
};

/**
 * Check if a method call on a string value is a safe string method (e.g. "abc".repeat(3)).
 * Returns a bound function if so, undefined otherwise.
 */
export function getSafeStringMethod(
	value: unknown,
	methodName: string,
): ((...args: unknown[]) => unknown) | undefined {
	if (typeof value !== 'string') return undefined;
	const factory = SAFE_STRING_METHODS[methodName];
	if (!factory) return undefined;
	return (...args: unknown[]) => factory(value, ...args);
}
