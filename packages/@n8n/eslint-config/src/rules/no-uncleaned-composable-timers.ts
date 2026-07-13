import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const { AST_NODE_TYPES } = TSESTree;

/**
 * Functions that schedule a side-effect whose pending timer is NOT torn down
 * automatically when the surrounding reactive scope is disposed. `useDebounceFn`
 * / `useThrottleFn` keep a bare `setTimeout` alive after the component unmounts,
 * and raw `setTimeout` / `setInterval` obviously do too. (vueuse's `useTimeoutFn`
 * / `useIntervalFn` / `useRafFn` register their own `tryOnScopeDispose`, so they
 * are intentionally excluded.)
 */
const SCHEDULERS = new Set(['useDebounceFn', 'useThrottleFn', 'setTimeout', 'setInterval']);

/** Lifecycle / scope hooks that register teardown for the composable. */
const CLEANUP_HOOKS = new Set([
	'onScopeDispose',
	'tryOnScopeDispose',
	'onUnmounted',
	'onBeforeUnmount',
]);

/** Calls that cancel a scheduled side-effect. */
const CANCELERS = new Set(['clearTimeout', 'clearInterval']);

/** A composable is a function whose name matches `use` + PascalCase. */
const COMPOSABLE_NAME = /^use[A-Z0-9]/;

type FunctionNode =
	| TSESTree.FunctionDeclaration
	| TSESTree.FunctionExpression
	| TSESTree.ArrowFunctionExpression;

function getComposableName(node: FunctionNode): string | undefined {
	if (node.type === AST_NODE_TYPES.FunctionDeclaration && node.id) {
		return node.id.name;
	}

	const { parent } = node;
	if (
		parent?.type === AST_NODE_TYPES.VariableDeclarator &&
		parent.id.type === AST_NODE_TYPES.Identifier
	) {
		return parent.id.name;
	}

	return undefined;
}

function getCalleeName(node: TSESTree.CallExpression): string | undefined {
	const { callee } = node;
	if (callee.type === AST_NODE_TYPES.Identifier) {
		return callee.name;
	}
	// `window.setTimeout(...)`, `foo.cancel()`, etc.
	if (
		callee.type === AST_NODE_TYPES.MemberExpression &&
		callee.property.type === AST_NODE_TYPES.Identifier
	) {
		return callee.property.name;
	}
	return undefined;
}

type ComposableFrame = {
	scheduler?: TSESTree.CallExpression;
	hasCleanup: boolean;
};

export const NoUncleanedComposableTimersRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Composables that schedule a debounced/throttled/timer side-effect must register teardown (`onScopeDispose`/`onUnmounted`) or cancel it, so the timer cannot fire after the scope is disposed.',
		},
		schema: [],
		messages: {
			uncleanedTimer:
				'This composable schedules a debounced/throttled/timer side-effect but never registers teardown (`onScopeDispose`/`onUnmounted`/`onBeforeUnmount`) or cancels it (`.cancel()`/`clearTimeout`/`clearInterval`). A leaked timer that fires after the scope is disposed is a real memory leak and flakes unit tests (fires post-jsdom-teardown). Register cleanup or expose and call a cancel.',
		},
	},
	defaultOptions: [],
	create({ report }) {
		// Stack of composable functions currently being traversed. Timer/cleanup
		// calls are attributed to the innermost composable frame, so a scheduler
		// inside a nested callback still counts against its composable.
		const stack: ComposableFrame[] = [];

		function enterFunction(node: FunctionNode) {
			if (getComposableName(node)?.match(COMPOSABLE_NAME)) {
				stack.push({ hasCleanup: false });
			}
		}

		function exitFunction(node: FunctionNode) {
			if (!getComposableName(node)?.match(COMPOSABLE_NAME)) {
				return;
			}
			const frame = stack.pop();
			if (frame?.scheduler && !frame.hasCleanup) {
				report({ node: frame.scheduler, messageId: 'uncleanedTimer' });
			}
		}

		return {
			FunctionDeclaration: enterFunction,
			'FunctionDeclaration:exit': exitFunction,
			FunctionExpression: enterFunction,
			'FunctionExpression:exit': exitFunction,
			ArrowFunctionExpression: enterFunction,
			'ArrowFunctionExpression:exit': exitFunction,
			CallExpression(node) {
				const frame = stack[stack.length - 1];
				if (!frame) return;

				const name = getCalleeName(node);
				if (!name) return;

				if (CLEANUP_HOOKS.has(name) || CANCELERS.has(name) || name === 'cancel') {
					frame.hasCleanup = true;
					return;
				}

				if (!frame.scheduler && SCHEDULERS.has(name)) {
					frame.scheduler = node;
				}
			},
		};
	},
});
