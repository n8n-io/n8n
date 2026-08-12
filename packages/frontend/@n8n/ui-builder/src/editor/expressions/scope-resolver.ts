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

/**
 * What the editor re-resolves on. It watches this without `deep`, and the scope
 * is one object held across every change to the state inside it, so its identity
 * never moves — filling a canvas input would leave the preview showing the value
 * from before. Reading the scope out as text both tracks every key an expression
 * could name and changes only when one of them does.
 */
function scopeSignature(scope: UiScope): unknown {
	try {
		return JSON.stringify(scope);
	} catch {
		// Something in state is circular or otherwise unserialisable. Falling back
		// to the object costs the deep watch, not the preview.
		return scope;
	}
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

	return { resolve, watchImmediate: () => scopeSignature(getScope()) };
}
