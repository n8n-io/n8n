import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { isFileType } from '../utils/index.js';
import { createRule } from '../utils/rule-creator.js';

const ALLOWED_ERROR_CLASSES = new Set(['NodeApiError', 'NodeOperationError']);

function getThrowCalleeName(argument: TSESTree.Expression): string | null {
	if (argument.type === AST_NODE_TYPES.NewExpression) {
		if (argument.callee.type === AST_NODE_TYPES.Identifier) {
			return argument.callee.name;
		}
	}
	return null;
}

function getEnclosingCatchClause(node: TSESTree.Node): TSESTree.CatchClause | null {
	let current: TSESTree.Node | undefined = node.parent;
	while (current) {
		if (current.type === AST_NODE_TYPES.CatchClause) {
			return current;
		}
		current = current.parent;
	}
	return null;
}

function isCatchParam(catchClause: TSESTree.CatchClause, name: string): boolean {
	return catchClause.param?.type === AST_NODE_TYPES.Identifier && catchClause.param.name === name;
}

export const RequireNodeApiErrorRule = createRule({
	name: 'require-node-api-error',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require NodeApiError or NodeOperationError for error wrapping in catch blocks. ' +
				'Raw errors lose HTTP context in the n8n UI.',
		},
		messages: {
			useNodeApiError:
				'Use `NodeApiError` or `NodeOperationError` instead of re-throwing raw errors. ' +
				'Example: `throw new NodeApiError(this.getNode(), error as JsonObject)`',
			useNodeApiErrorInsteadOfGeneric:
				'Use `NodeApiError` or `NodeOperationError` instead of `{{ errorClass }}`. ' +
				'Example: `throw new NodeApiError(this.getNode(), error as JsonObject)`',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const isNodeFile = isFileType(context.filename, '.node.ts');
		const isHelperFile =
			context.filename.endsWith('.ts') &&
			!isNodeFile &&
			!isFileType(context.filename, '.credentials.ts');

		if (!isNodeFile && !isHelperFile) {
			return {};
		}

		return {
			ThrowStatement(node) {
				const catchClause = getEnclosingCatchClause(node);
				if (!catchClause) return;
				if (!node.argument) return;

				const { argument } = node;

				if (
					argument.type === AST_NODE_TYPES.Identifier &&
					isCatchParam(catchClause, argument.name)
				) {
					context.report({ node, messageId: 'useNodeApiError' });
					return;
				}

				const calleeName = getThrowCalleeName(argument);
				if (calleeName !== null && !ALLOWED_ERROR_CLASSES.has(calleeName)) {
					context.report({
						node,
						messageId: 'useNodeApiErrorInsteadOfGeneric',
						data: { errorClass: calleeName },
					});
				}
			},
		};
	},
});
