import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * `.todo` runners, by what they do with a callback they are handed. Verified on
 * vitest 4.1.9: `it.todo`/`test.todo` never invoke the callback at all, while
 * `describe.todo`/`suite.todo` do collect the block but mark every test in it
 * todo, so nothing inside ever executes. Same harm, different mechanism — hence
 * two messages.
 */
const TEST_RUNNERS = new Set(['it', 'test']);
const SUITE_RUNNERS = new Set(['describe', 'suite']);

const FUNCTION_TYPES = new Set<TSESTree.AST_NODE_TYPES>([
	TSESTree.AST_NODE_TYPES.ArrowFunctionExpression,
	TSESTree.AST_NODE_TYPES.FunctionExpression,
]);

/**
 * Resolve `it` from `it.todo` or `it.concurrent.todo` by walking the member
 * chain left. Returns undefined for anything not rooted in a bare identifier.
 */
const rootIdentifier = (node: TSESTree.Expression): TSESTree.Identifier | undefined => {
	let current: TSESTree.Node = node;

	while (current.type === TSESTree.AST_NODE_TYPES.MemberExpression) {
		current = current.object;
	}

	return current.type === TSESTree.AST_NODE_TYPES.Identifier ? current : undefined;
};

export const NoTodoTestWithBodyRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow passing a body to `.todo()`. Unlike `.skip()`, a `.todo()` body never executes, so the test reads as covered in review, reports as todo, and asserts nothing.',
		},
		messages: {
			discardedBody:
				'`{{ callee }}()` discards its callback: this body never runs and can never fail. Either promote it to `{{ runner }}()` so it executes, or delete the body and leave `{{ callee }}()` as a name-only placeholder.',
			todoSuiteBody:
				'`{{ callee }}()` marks every test in this block as todo, so none of them ever run or can fail. Either promote it to `{{ runner }}()` so they execute, or delete the block and leave `{{ callee }}()` as a name-only placeholder.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				const { callee } = node;

				if (
					callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
					callee.computed ||
					callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
					callee.property.name !== 'todo'
				) {
					return;
				}

				const runner = rootIdentifier(callee);

				if (!runner) return;

				const isTest = TEST_RUNNERS.has(runner.name);

				if (!isTest && !SUITE_RUNNERS.has(runner.name)) return;

				// Only inline bodies — an options object as second argument is legitimate.
				const hasBody = node.arguments.slice(1).some((arg) => FUNCTION_TYPES.has(arg.type));

				if (!hasBody) return;

				context.report({
					node: callee,
					messageId: isTest ? 'discardedBody' : 'todoSuiteBody',
					data: {
						callee: context.sourceCode.getText(callee),
						runner: runner.name,
					},
				});
			},
		};
	},
});
