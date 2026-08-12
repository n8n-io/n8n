import type { ExpressionResolution, ExpressionResolver } from '@n8n/expression-editor';

import { evaluateExpression } from '../../core/expressions';
import type { UiScope } from '../../core/types';

/** Resolves the editor's preview against the scope the canvas is rendering in. */
export function uiScopeResolver(getScope: () => UiScope): ExpressionResolver {
	function resolve(resolvable: string): ExpressionResolution {
		try {
			return {
				resolved: evaluateExpression(resolvable, getScope()),
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
