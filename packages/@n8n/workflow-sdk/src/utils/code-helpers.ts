import type { CodeResult, AllItemsContext, EachItemContext } from '../types/base';

/**
 * Extract the function body and strip the ctx. prefix
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-restricted-types
function extractFunctionBody(fn: Function): string {
	const fnStr = fn.toString();

	// Handle arrow functions: (ctx) => { ... } or ctx => { ... } or (ctx) => expression
	const arrowMatch = fnStr.match(/^\s*\(?(\w+)\)?\s*=>\s*(.+)$/s);
	if (arrowMatch) {
		const paramName = arrowMatch[1];
		let body = arrowMatch[2].trim();

		// If body starts with {, it's a block - extract the content
		if (body.startsWith('{') && body.endsWith('}')) {
			body = body.slice(1, -1).trim();
		} else {
			// Single expression - wrap in return
			body = `return ${body};`;
		}

		// Replace parameter name with $ for n8n
		// ctx.$ -> $
		// ctx('NodeName') -> $('NodeName')
		body = body.replace(new RegExp(`${paramName}\\.\\$`, 'g'), '$');
		body = body.replace(new RegExp(`${paramName}\\(`, 'g'), '$(');
		body = body.replace(new RegExp(`${paramName}\\.`, 'g'), '');

		return body;
	}

	// Handle regular functions: function(ctx) { ... }
	const funcMatch = fnStr.match(/function\s*\(\s*(\w+)\s*\)\s*\{([\s\S]*)\}$/);
	if (funcMatch) {
		const paramName = funcMatch[1];
		let body = funcMatch[2].trim();

		// Replace parameter name
		body = body.replace(new RegExp(`${paramName}\\.\\$`, 'g'), '$');
		body = body.replace(new RegExp(`${paramName}\\(`, 'g'), '$(');
		body = body.replace(new RegExp(`${paramName}\\.`, 'g'), '');

		return body;
	}

	throw new Error('Unable to parse function body');
}

/**
 * Create a code helper for executing once with access to all items
 *
 * The function receives a context object with:
 * - ctx.$input.all() - get all input items
 * - ctx.$input.first() - get first input item
 * - ctx.$input.last() - get last input item
 * - ctx.$input.itemMatching(i) - get item at index
 * - ctx.$env, ctx.$vars, ctx.$secrets - environment access
 * - ctx.$now, ctx.$today - date helpers
 * - ctx.$execution, ctx.$workflow - metadata
 * - ctx('NodeName') - reference other node outputs
 *
 * @param fn - Function that processes all items and returns an array
 * @returns Code configuration for the Code node
 *
 * @example
 * ```typescript
 * node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     ...runOnceForAllItems<{ sum: number }>((ctx) => {
 *       const total = ctx.$input.all().reduce((acc, i) => acc + i.json.value, 0);
 *       return [{ json: { sum: total } }];
 *     })
 *   }
 * });
 * ```
 */
export function runOnceForAllItems<T = unknown>(
	fn: (ctx: AllItemsContext) => Array<{ json: T }>,
): CodeResult<T> {
	const jsCode = extractFunctionBody(fn);

	return {
		mode: 'runOnceForAllItems',
		jsCode,
	};
}

/**
 * Create a code helper for executing once per item
 *
 * The function receives a context object with:
 * - ctx.$input.item - current input item
 * - ctx.$itemIndex - current item index
 * - ctx.$env, ctx.$vars, ctx.$secrets - environment access
 * - ctx.$now, ctx.$today - date helpers
 * - ctx.$execution, ctx.$workflow - metadata
 * - ctx('NodeName') - reference other node outputs
 *
 * @param fn - Function that processes a single item and returns one item or null
 * @returns Code configuration for the Code node
 *
 * @example
 * ```typescript
 * node('n8n-nodes-base.code', 'v2', {
 *   parameters: {
 *     ...runOnceForEachItem<{ doubled: number }>((ctx) => {
 *       return { json: { doubled: ctx.$input.item.json.value * 2 } };
 *     })
 *   }
 * });
 * ```
 */
export function runOnceForEachItem<T = unknown>(
	fn: (ctx: EachItemContext) => { json: T } | null,
): CodeResult<T> {
	const jsCode = extractFunctionBody(fn);

	return {
		mode: 'runOnceForEachItem',
		jsCode,
	};
}
