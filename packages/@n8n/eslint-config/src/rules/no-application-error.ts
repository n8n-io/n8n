import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const BANNED_SOURCES = new Set(['@n8n/errors', 'n8n-workflow']);

/**
 * Files allowed to import `ApplicationError`: the error-handling boundaries that
 * must still recognize community-thrown `ApplicationError`s via `instanceof`,
 * and the tests that exercise the compatibility shim. New code must not import
 * it — use `UserError`, `OperationalError` or `UnexpectedError` instead.
 */
const ALLOWED_FILES = [
	// Error-handling boundaries (recognize legacy errors thrown by community nodes)
	'error-reporter.ts',
	'workflow-execute.ts',
	'type-validation.ts',
	// Tests covering the shim / legacy-error handling
	'application-error.test.ts',
	'error-reporter.test.ts',
	'workflow-execute-node-error-reporting.test.ts',
];

export const NoApplicationErrorRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow importing the deprecated `ApplicationError`. It is kept only as a compatibility shim for community nodes; internal code must use `UserError`, `OperationalError` or `UnexpectedError`.',
		},
		messages: {
			noApplicationError:
				'Do not import `ApplicationError`. It is a deprecated compatibility shim for community nodes. Use `UserError`, `OperationalError` or `UnexpectedError` from `n8n-workflow` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (ALLOWED_FILES.some((file) => context.filename.endsWith(file))) {
			return {};
		}

		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (!BANNED_SOURCES.has(source) && !source.includes('errors')) return;

				for (const specifier of node.specifiers) {
					if (
						specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
						specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier &&
						specifier.imported.name === 'ApplicationError'
					) {
						context.report({ node: specifier, messageId: 'noApplicationError' });
					}
				}
			},
		};
	},
});
