import type { Expression, ExpressionContext } from '../types/base';

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
				return { __path__: ['__SPECIAL__', `Object.keys($binary)`] };
			}

			// Handle $('NodeName') syntax
			if (path.length === 1 && path[0] === '$') {
				const nodeName = args[0];
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

		// Handle the root $
		if (i === 0) {
			if (part === 'json') {
				result = '$json';
			} else if (part === 'binary') {
				result = '$binary';
			} else if (part === 'env') {
				result = '$env';
			} else if (part === 'vars') {
				result = '$vars';
			} else if (part === 'secrets') {
				result = '$secrets';
			} else if (part === 'itemIndex') {
				result = '$itemIndex';
			} else if (part === 'runIndex') {
				result = '$runIndex';
			} else if (part === 'now') {
				result = '$now';
			} else if (part === 'today') {
				result = '$today';
			} else if (part === 'execution') {
				result = '$execution';
			} else if (part === 'workflow') {
				result = '$workflow';
			} else if (part === 'input') {
				result = '$input';
			} else if (part === '$') {
				result = '$';
			} else {
				result = part;
			}
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
 * Create a raw n8n expression string
 *
 * Use this for complex expressions that can't be represented with the
 * serializeExpression proxy approach, such as:
 * - Node references: $('NodeName').item.json.x
 * - Template literals: `Bearer ${$env.API_TOKEN}`
 * - Array operations: $json.items.map(i => i.name).join(", ")
 *
 * @param expression - The inner expression (without {{ }})
 * @returns n8n expression string like '={{ expression }}'
 *
 * @example
 * ```typescript
 * expr("$('Config').item.json.apiUrl")  // "={{ $('Config').item.json.apiUrl }}"
 * expr('`Bearer ${$env.API_TOKEN}`')    // '={{ `Bearer ${$env.API_TOKEN}` }}'
 * ```
 */
export function expr(expression: string): string {
	return `={{ ${expression} }}`;
}

// Re-export for convenience
export { parseExpression as parse, serializeExpression as serialize };
