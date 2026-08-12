import { Tournament } from '@n8n/tournament';

import type { UiScope } from './types';
import { isExpression } from '../schema/validate';

// Defined in the schema half, where the node's validator also needs it.
export { isExpression };

// The same evaluator editor-ui uses in the browser. `@n8n/expression-runtime`
// is not an option here: it depends on isolated-vm and editor-ui aliases the
// whole package to throwing stubs for browser builds.
//
// The sandboxing AST hooks from packages/workflow are deliberately not applied.
// They are not exported for outside use, and the expressions here are the app
// author's own, running in their own browser.
const tournament = new Tournament((error) => {
	console.warn('[ui-builder] expression error', error);
});

/**
 * Resolves one prop value against the scope it is rendered in. Literals pass
 * through untouched. A failed expression yields `undefined` rather than
 * throwing, so one bad prop cannot take down the render.
 *
 * The scope is an object rather than the state alone because names can be bound
 * by an ancestor: `$item` and `$index` inside a repeat, `$loading` from the
 * runtime. `$state` is simply one of its keys.
 */
export function resolveValue(value: unknown, scope: UiScope): unknown {
	if (!isExpression(value)) return value;

	try {
		return evaluateExpression(value, scope);
	} catch (error) {
		console.warn('[ui-builder] failed to resolve', value, error);
		return undefined;
	}
}

/** The same evaluation, throwing, for callers that need to show why it failed. */
export function evaluateExpression(source: string, scope: UiScope): unknown {
	return tournament.execute(source.startsWith('=') ? source.slice(1) : source, { ...scope });
}
