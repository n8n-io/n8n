/**
 * Flags `this.helpers.httpRequest()` in functions that also call `this.getCredentials()`.
 * Those functions should use `this.helpers.httpRequestWithAuthentication()` instead.
 *
 * Uses a function-scope stack: if both `getCredentials` and `httpRequest` appear in
 * the same function body, every `httpRequest` call is reported. Nested functions are
 * checked independently.
 *
 * Alternatives considered:
 * - Checking for credential variables in `httpRequest` arguments — misses the common
 *   pattern where options are built in a separate variable first.
 * - Matching auth header names (`Authorization`, etc.) — brittle and requires deep
 *   AST traversal with no guarantee of coverage.
 *
 * Known false positive: a function that fetches credentials for a non-HTTP purpose
 * and also makes an unauthenticated request. Use eslint-disable to suppress.
 */

import type { TSESTree } from '@typescript-eslint/utils';

import { createRule, isThisHelpersMethodCall, isThisMethodCall } from '../utils/index.js';

type FunctionScope = {
	getCredentialsCall: TSESTree.CallExpression | null;
	httpRequestCalls: TSESTree.CallExpression[];
};

export const NoHttpRequestWithManualAuthRule = createRule({
	name: 'no-http-request-with-manual-auth',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Disallow this.helpers.httpRequest() in functions that call this.getCredentials(). Use this.helpers.httpRequestWithAuthentication() instead.',
		},
		messages: {
			useHttpRequestWithAuthentication:
				"Avoid calling 'this.helpers.httpRequest()' in a function that retrieves credentials via 'this.getCredentials()'. Use 'this.helpers.httpRequestWithAuthentication()' instead — it handles authentication internally and benefits from future n8n improvements like token refresh and audit logging.",
		},
		schema: [],
		hasSuggestions: false,
	},
	defaultOptions: [],
	create(context) {
		const scopeStack: FunctionScope[] = [];

		const pushScope = () => scopeStack.push({ getCredentialsCall: null, httpRequestCalls: [] });

		const popScope = () => {
			const scope = scopeStack.pop();
			if (scope?.getCredentialsCall && scope.httpRequestCalls.length > 0) {
				for (const call of scope.httpRequestCalls) {
					context.report({ node: call, messageId: 'useHttpRequestWithAuthentication' });
				}
			}
		};

		return {
			FunctionDeclaration: pushScope,
			FunctionExpression: pushScope,
			ArrowFunctionExpression: pushScope,
			'FunctionDeclaration:exit': popScope,
			'FunctionExpression:exit': popScope,
			'ArrowFunctionExpression:exit': popScope,

			CallExpression(node: TSESTree.CallExpression) {
				const scope = scopeStack[scopeStack.length - 1];
				if (!scope) return;
				if (isThisMethodCall(node, 'getCredentials')) {
					scope.getCredentialsCall = node;
				}
				if (isThisHelpersMethodCall(node, 'httpRequest')) {
					scope.httpRequestCalls.push(node);
				}
			},
		};
	},
});
