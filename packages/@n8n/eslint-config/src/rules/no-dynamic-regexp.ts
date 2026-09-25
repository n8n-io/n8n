import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';

type MessageIds = 'noDynamicRegExp';
type Options = [];

type Variable = {
	defs: Array<{
		type: string;
		node?: {
			init?: TSESTree.Expression | null;
		};
		name?: TSESTree.Identifier;
		parent?: {
			kind?: string;
		};
	}>;
	references: Array<{
		identifier?: TSESTree.Identifier;
		isReadOnly: () => boolean;
	}>;
};

type Scope = {
	set: Map<string, unknown>;
	upper: Scope | null;
};

type SourceCodeWithScope = {
	getScope(node: TSESTree.Node): unknown;
};

const MAX_STATIC_EXPRESSION_DEPTH = 100;
const EVALUATING = Symbol('evaluating');

const STATIC_METHODS = new Set([
	'concat',
	'replace',
	'replaceAll',
	'slice',
	'substring',
	'toLowerCase',
	'toUpperCase',
	'trim',
]);

function hasGetScope(sourceCode: unknown): sourceCode is SourceCodeWithScope {
	return (
		typeof sourceCode === 'object' &&
		sourceCode !== null &&
		typeof Reflect.get(sourceCode, 'getScope') === 'function'
	);
}

function getScope(context: Readonly<RuleContext<MessageIds, Options>>) {
	const sourceCode = context.sourceCode ?? context.getSourceCode();
	return (node: TSESTree.Node) =>
		(hasGetScope(sourceCode) ? sourceCode.getScope(node) : context.getScope()) as Scope;
}

function isVariable(value: unknown): value is Variable {
	return (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray(Reflect.get(value, 'defs')) &&
		Array.isArray(Reflect.get(value, 'references'))
	);
}

function findVariable(scope: Scope, name: string): Variable | undefined {
	let currentScope: Scope | null = scope;

	while (currentScope) {
		const variable = currentScope.set.get(name);
		if (isVariable(variable)) return variable;
		currentScope = currentScope.upper;
	}

	return undefined;
}

function isStaticExpression(
	node: TSESTree.Node,
	getNodeScope: (node: TSESTree.Node) => Scope,
	cache: WeakMap<TSESTree.Node, boolean | typeof EVALUATING>,
	depth = 0,
): boolean {
	// Stop and don't report if the expression is too deep.
	if (depth >= MAX_STATIC_EXPRESSION_DEPTH) return true;

	// Cache shared initializers and mark active nodes to reject circular references.
	const cached = cache.get(node);
	if (cached !== undefined) return cached === EVALUATING ? false : cached;

	cache.set(node, EVALUATING);
	const scope = getNodeScope(node);
	const nextDepth = depth + 1;

	const isStatic = (() => {
		switch (node.type) {
			// A string, number, boolean, null, bigint, or regex written directly in source.
			case 'Literal':
				return true;

			// A template string whose interpolated expressions must all be static.
			case 'TemplateLiteral':
				return node.expressions.every((expression) =>
					isStaticExpression(expression, getNodeScope, cache, nextDepth),
				);

			// String concatenation, provided both operands are static.
			case 'BinaryExpression':
				return (
					node.operator === '+' &&
					isStaticExpression(node.left, getNodeScope, cache, nextDepth) &&
					isStaticExpression(node.right, getNodeScope, cache, nextDepth)
				);

			// A named binding, such as an import or an immutable const variable.
			case 'Identifier': {
				const variable = findVariable(scope, node.name);
				if (!variable || variable.defs.length !== 1) return false;

				const [definition] = variable.defs;
				if (definition.type === 'ImportBinding') return true;

				const isConstDeclaration = definition.parent?.kind === 'const';
				if (definition.type !== 'Variable' || !isConstDeclaration || !definition.node?.init) {
					return false;
				}

				const isNeverWrittenAfterInit = variable.references.every(
					(reference) => reference.isReadOnly() || reference.identifier === definition.name,
				);
				return (
					isNeverWrittenAfterInit &&
					isStaticExpression(definition.node.init, getNodeScope, cache, nextDepth)
				);
			}

			// Property access on a static object, including a static computed property.
			case 'MemberExpression':
				return (
					isStaticExpression(node.object, getNodeScope, cache, nextDepth) &&
					(!node.computed || isStaticExpression(node.property, getNodeScope, cache, nextDepth))
				);

			// A whitelisted deterministic method called on static data with static arguments.
			case 'CallExpression': {
				if (node.callee.type !== 'MemberExpression' || node.callee.computed) return false;
				if (node.callee.property.type !== 'Identifier') return false;
				if (!STATIC_METHODS.has(node.callee.property.name)) return false;

				return (
					isStaticExpression(node.callee.object, getNodeScope, cache, nextDepth) &&
					node.arguments.every(
						(argument) =>
							argument.type !== 'SpreadElement' &&
							isStaticExpression(argument, getNodeScope, cache, nextDepth),
					)
				);
			}

			// TypeScript-only wrappers that do not change the expression's runtime value.
			case 'TSAsExpression':
			case 'TSSatisfiesExpression':
			case 'TSNonNullExpression':
			case 'TSInstantiationExpression':
				return isStaticExpression(node.expression, getNodeScope, cache, nextDepth);

			// All other expression types may depend on runtime data.
			default:
				return false;
		}
	})();

	cache.set(node, isStatic);
	return isStatic;
}

export const NoDynamicRegExpRule = ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow RegExp constructors from dynamic values; use safeRegex for user-controlled patterns.',
		},
		schema: [],
		messages: {
			noDynamicRegExp:
				'Use safeRegex for dynamic regular expressions. Only literal or statically resolvable RegExp patterns are allowed.',
		},
	},
	defaultOptions: [],
	create(context) {
		const getNodeScope = getScope(context);
		const staticExpressionCache = new WeakMap<TSESTree.Node, boolean | typeof EVALUATING>();

		return {
			NewExpression(node: TSESTree.NewExpression) {
				if (node.callee.type !== 'Identifier' || node.callee.name !== 'RegExp') return;

				const [pattern] = node.arguments;
				if (!pattern || pattern.type === 'SpreadElement') return;

				if (isStaticExpression(pattern, getNodeScope, staticExpressionCache)) return;

				context.report({
					node,
					messageId: 'noDynamicRegExp',
				});
			},
		};
	},
});
