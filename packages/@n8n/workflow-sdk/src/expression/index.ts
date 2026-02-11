import { FROM_AI_AUTO_GENERATED_MARKER } from 'n8n-workflow';

import type { Expression, ExpressionContext, FromAIArgumentType } from '../types/base';

/**
 * Parse n8n expression string to extract the inner expression
 * @param expr - Expression string like '={{ $json.name }}'
 * @returns The inner expression or original string if not an expression
 */
export function parseExpression(expr: string): string {
	const match = expr.match(/^=\{\{\s*([\s\S]*?)\s*\}\}$/);
	return match ? match[1] : expr;
}

/**
 * Check if a string is an n8n expression
 */
export function isExpression(value: unknown): boolean {
	return typeof value === 'string' && value.startsWith('={{') && value.endsWith('}}');
}

/**
 * Create a proxy-based context that tracks property accesses
 */
function createExpressionProxy(path: string[] = []): unknown {
	const handler: ProxyHandler<object> = {
		get(_target, prop) {
			if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
				return () => buildPath(path);
			}
			if (prop === '__path__') {
				return path;
			}
			if (typeof prop === 'symbol') {
				return undefined;
			}
			return createExpressionProxy([...path, String(prop)]);
		},
		apply(_target, _thisArg, args) {
			// Handle function calls like $('NodeName') or input.first()
			const lastPart = path[path.length - 1];
			const parentPath = path.slice(0, -1);

			if (lastPart === 'keys' && parentPath.join('.') === 'binary') {
				// Special case: $.binary.keys() -> Object.keys($binary)
				return { __path__: ['__SPECIAL__', 'Object.keys($binary)'] };
			}

			// Handle $('NodeName') syntax
			if (path.length === 1 && path[0] === '$') {
				const nodeName = String(args[0]);
				return createExpressionProxy(['$', `('${nodeName}')`, 'item']);
			}

			// Regular function call like input.first()
			const argsStr = args.map((a) => JSON.stringify(a)).join(', ');
			return createExpressionProxy([...parentPath, `${lastPart}(${argsStr})`]);
		},
	};

	return new Proxy(function () {}, handler);
}

/**
 * Mapping from expression context property names to n8n expression roots.
 * Maps SDK property names (e.g., 'json') to their n8n equivalents (e.g., '$json').
 */
const EXPRESSION_ROOT_MAPPINGS: Record<string, string> = {
	json: '$json',
	binary: '$binary',
	env: '$env',
	vars: '$vars',
	secrets: '$secrets',
	itemIndex: '$itemIndex',
	runIndex: '$runIndex',
	now: '$now',
	today: '$today',
	execution: '$execution',
	workflow: '$workflow',
	input: '$input',
	$: '$',
} as const;

/**
 * Build the expression path string
 */
function buildPath(path: string[]): string {
	if (path.length === 0) return '';

	// Handle special paths
	if (path[0] === '__SPECIAL__') {
		return path[1];
	}

	let result = '';
	for (let i = 0; i < path.length; i++) {
		const part = path[i];

		// Handle the root expression context
		if (i === 0) {
			result = EXPRESSION_ROOT_MAPPINGS[part] ?? part;
			continue;
		}

		// Handle function call notation
		if (part.startsWith('(')) {
			result += part;
			continue;
		}

		// Handle method calls
		if (part.includes('(')) {
			result += '.' + part;
			continue;
		}

		// Regular property access
		result += '.' + part;
	}

	return result;
}

/**
 * Serialize an expression function to n8n expression string
 *
 * Uses a proxy-based approach to capture property accesses from the
 * expression function and convert them to n8n expression format.
 *
 * @param fn - Expression function like $ => $.json.name
 * @returns n8n expression string like '={{ $json.name }}'
 *
 * @example
 * ```typescript
 * serializeExpression($ => $.json.name)        // '={{ $json.name }}'
 * serializeExpression($ => $('Config').json.x) // "={{ $('Config').item.json.x }}"
 * serializeExpression($ => $.env.API_TOKEN)    // '={{ $env.API_TOKEN }}'
 * ```
 */
export function serializeExpression<T>(fn: Expression<T>): string {
	// Create a proxy to capture the expression
	const proxy = createExpressionProxy([]) as ExpressionContext;

	// Execute the function with the proxy
	const result = fn(proxy);

	// Extract the path from the result
	let exprPath: string;

	if (result && typeof result === 'object' && '__path__' in result) {
		const path = (result as { __path__: string[] }).__path__;
		exprPath = buildPath(path);
	} else if (typeof result === 'string') {
		// Handle template literals - need special processing
		// For now, return as-is if it's a string
		exprPath = String(result);
	} else {
		exprPath = String(result);
	}

	return `={{ ${exprPath} }}`;
}

/**
 * Mark a string as an n8n expression by adding the required '=' prefix.
 *
 * Use this for any parameter value that contains {{ }} expression syntax.
 * Strips any existing leading '=' to prevent double-equals from LLM output,
 * then adds the '=' prefix.
 *
 * @param expression - Expression string (should contain {{ }} syntax)
 * @returns String with '=' prefix
 *
 * @example
 * ```typescript
 * expr('{{ $json.name }}')           // '={{ $json.name }}'
 * expr('Hello {{ $json.name }}')     // '=Hello {{ $json.name }}'
 * expr('={{ $json.x }}')             // '={{ $json.x }}' (strips redundant =)
 * ```
 */
function isPlaceholderLike(value: unknown): value is { __placeholder: true; hint: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'__placeholder' in value &&
		(value as Record<string, unknown>).__placeholder === true &&
		'hint' in value &&
		typeof (value as Record<string, unknown>).hint === 'string'
	);
}

function isNewCredentialLike(value: unknown): value is { __newCredential: true; name: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'__newCredential' in value &&
		(value as Record<string, unknown>).__newCredential === true &&
		'name' in value &&
		typeof (value as Record<string, unknown>).name === 'string'
	);
}

export function expr(expression: string): string {
	if (typeof expression !== 'string') {
		// At runtime, the AST interpreter may pass non-string values (e.g. PlaceholderImpl objects).
		// TypeScript narrows to `never` here since the param is typed as `string`,
		// so we re-bind as `unknown` to perform runtime type checks.
		const value: unknown = expression;
		if (isPlaceholderLike(value)) {
			throw new Error(
				`expr(placeholder('${value.hint}')) is invalid. Use placeholder() directly as the value, not inside expr().`,
			);
		}
		if (isNewCredentialLike(value)) {
			throw new Error(
				`expr(newCredential('${value.name}')) is invalid. Use newCredential() directly in the credentials config, not inside expr().`,
			);
		}
		throw new Error(`expr() requires a string argument, but received ${typeof value}.`);
	}
	// Strip any leading '=' to prevent double-equals patterns from LLM output
	const normalized = expression.startsWith('=') ? expression.slice(1) : expression;
	return '=' + normalized;
}

// =============================================================================
// $fromAI Expression Generator
// =============================================================================

/**
 * Sanitize a key for use in $fromAI expression.
 * Keys must be 1-64 characters, alphanumeric with underscores and hyphens only.
 *
 * @param key - The original key string
 * @returns Sanitized key that meets $fromAI requirements
 */
function sanitizeFromAIKey(key: string): string {
	// Replace non-alphanumeric (except underscore/hyphen) with underscores
	let sanitized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
	// Collapse consecutive underscores
	sanitized = sanitized.replace(/_+/g, '_');
	// Trim leading/trailing underscores
	sanitized = sanitized.replace(/^_+|_+$/g, '');
	// Truncate to 64 chars max
	sanitized = sanitized.slice(0, 64);
	// Fallback to 'param' if empty
	return sanitized || 'param';
}

/**
 * Escape a string for use in a quoted argument.
 * Handles backslashes and the quote character being used.
 */
function escapeForQuote(str: string, quoteChar: string): string {
	// Escape backslashes first, then the quote character
	return str.replace(/\\/g, '\\\\').replace(new RegExp(quoteChar, 'g'), `\\${quoteChar}`);
}

/**
 * Determine the best quote character to use based on string content.
 * Prefers single quote, falls back to double quote if single quotes are present,
 * or backtick if both are present.
 */
function getBestQuoteChar(str: string): string {
	const hasSingleQuote = str.includes("'");
	const hasDoubleQuote = str.includes('"');

	if (!hasSingleQuote) return "'";
	if (!hasDoubleQuote) return '"';
	return '`';
}

/**
 * Escape and quote a string argument for $fromAI call.
 */
function escapeArg(arg: string): string {
	const quoteChar = getBestQuoteChar(arg);
	return `${quoteChar}${escapeForQuote(arg, quoteChar)}${quoteChar}`;
}

/**
 * Serialize a default value for inclusion in the $fromAI expression.
 */
function serializeDefaultValue(value: string | number | boolean | object): string {
	if (typeof value === 'string') {
		return escapeArg(value);
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	// For objects/arrays, serialize as JSON
	return JSON.stringify(value);
}

/**
 * Create a $fromAI expression with the auto-generated marker.
 *
 * This is used internally by ToolConfigContext to generate expressions
 * that the AI agent will resolve at runtime.
 *
 * @param key - Unique identifier for the parameter
 * @param description - Description to help the AI understand what value to provide
 * @param type - Expected value type (default: 'string')
 * @param defaultValue - Fallback value if AI doesn't provide one
 * @returns Expression string like "={{ /*marker*\/ $fromAI('key', 'desc', 'type') }}"
 *
 * @example
 * createFromAIExpression('email')
 * // Returns: "={{ /*n8n-auto-generated-fromAI-override*\/ $fromAI('email') }}"
 *
 * @example
 * createFromAIExpression('count', 'Number of items', 'number', 10)
 * // Returns: "={{ /*n8n-auto-generated-fromAI-override*\/ $fromAI('count', 'Number of items', 'number', 10) }}"
 */
export function createFromAIExpression(
	key: string,
	description?: string,
	type: FromAIArgumentType = 'string',
	defaultValue?: string | number | boolean | object,
): string {
	const args: string[] = [];
	const marker = FROM_AI_AUTO_GENERATED_MARKER;

	// Sanitize and push key
	const sanitizedKey = sanitizeFromAIKey(key);
	args.push(escapeArg(sanitizedKey));

	// description (use empty string if needed for positional args)
	if (description !== undefined || type !== 'string' || defaultValue !== undefined) {
		const desc = description ?? '';
		args.push(escapeArg(desc));
	}

	// type (only if not default or defaultValue follows)
	if (type !== 'string' || defaultValue !== undefined) {
		args.push(escapeArg(type));
	}

	// defaultValue
	if (defaultValue !== undefined) {
		args.push(serializeDefaultValue(defaultValue));
	}

	return `={{ ${marker} $fromAI(${args.join(', ')}) }}`;
}
