import type { ExpressionResolution, ExpressionResolver } from '@n8n/expression-editor';

import { evaluateExpression } from '../../core/expressions';
import type { UiScope } from '../../core/types';

/**
 * The preview renders `String(resolved)`, so an object handed over as-is reads
 * `[object Object]`. Objects are named and serialised the way the NDV does it
 * (`n8n-workflow`'s `Expression#convertObjectValueToString`), which the editor's
 * display layer then unwraps back to bare JSON when the resolvable is only part
 * of a larger template.
 */
function forDisplay(value: unknown): unknown {
	if (value === null || typeof value !== 'object') return value;

	const isDate = value instanceof Date;
	const typeName = isDate ? 'Date' : (value.constructor?.name ?? 'Object');
	const body = isDate ? value.toISOString() : JSON.stringify(value);

	// Spacing to match the NDV's rendering of the same value.
	return `[${typeName}: ${String(body).replace(/,"/g, ', "').replace(/":/g, '": ')}]`;
}

/** Resolves the editor's preview against the scope the canvas is rendering in. */
export function uiScopeResolver(getScope: () => UiScope): ExpressionResolver {
	function resolve(resolvable: string): ExpressionResolution {
		try {
			return {
				resolved: forDisplay(evaluateExpression(resolvable, getScope())),
				error: false,
				fullError: null,
			};
		} catch (error) {
			const failure = error instanceof Error ? error : new Error(String(error));
			return { resolved: `[${failure.message}]`, error: true, fullError: failure };
		}
	}

	return { resolve, watchImmediate: getScope };
}
