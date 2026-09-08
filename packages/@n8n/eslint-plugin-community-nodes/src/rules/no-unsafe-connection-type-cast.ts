import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findNodeDescriptionObject,
	findObjectProperty,
	findJsonProperty,
	createRule,
} from '../utils/index.js';

const ERASING_KEYWORDS: Partial<Record<AST_NODE_TYPES, string>> = {
	[AST_NODE_TYPES.TSNeverKeyword]: 'never',
	[AST_NODE_TYPES.TSAnyKeyword]: 'any',
	[AST_NODE_TYPES.TSUnknownKeyword]: 'unknown',
};

type Cast = TSESTree.TSAsExpression | TSESTree.TSTypeAssertion;

function isCast(node: TSESTree.Node): node is Cast {
	return (
		node.type === AST_NODE_TYPES.TSAsExpression || node.type === AST_NODE_TYPES.TSTypeAssertion
	);
}

type Wrapper = Cast | TSESTree.TSSatisfiesExpression;

function isWrapper(node: TSESTree.Node): node is Wrapper {
	return isCast(node) || node.type === AST_NODE_TYPES.TSSatisfiesExpression;
}

/**
 * Walks a wrapper chain such as `x as unknown as string[]` or
 * `x as never satisfies string[]`, outermost first. `satisfies` is traversed
 * but never collected: it checks the value instead of erasing its type, so it
 * can hide a cast without being one.
 */
function collectCasts(node: TSESTree.Node): Cast[] {
	const casts: Cast[] = [];
	let current = node;
	while (isWrapper(current)) {
		if (isCast(current)) casts.push(current);
		current = current.expression;
	}
	return casts;
}

/**
 * Removes the cast syntax itself and nothing else, so every other part of the
 * chain survives: a `satisfies` at any depth, and the expression's own text.
 */
function removeCastSyntax(fixer: TSESLint.RuleFixer, cast: Cast): TSESLint.RuleFix {
	return cast.type === AST_NODE_TYPES.TSTypeAssertion
		? // `<never>expr`: drop the leading `<never>`
			fixer.removeRange([cast.range[0], cast.expression.range[0]])
		: // `expr as never`: drop the trailing ` as never`
			fixer.removeRange([cast.expression.range[1], cast.range[1]]);
}

export const NoUnsafeConnectionTypeCastRule = createRule({
	name: 'no-unsafe-connection-type-cast',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow type-erasing casts (`as never`, `as any`, `as unknown`) on node description `inputs`/`outputs`',
		},
		messages: {
			erasingCast:
				'Remove the `as {{typeName}}` cast on "{{property}}". It disables type checking, so a malformed connection declaration passes both TypeScript and lint.',
			removeCast: 'Remove the cast',
		},
		hasSuggestions: true,
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		function checkProperty(value: TSESTree.Node, property: 'inputs' | 'outputs') {
			const casts = collectCasts(value);
			const [outermost] = casts;
			if (!outermost) return;

			// A chain is unsafe if any link erases the type, e.g. the `unknown`
			// in `as unknown as string[]` is what defeats the checker.
			const erasing = casts.find((cast) => ERASING_KEYWORDS[cast.typeAnnotation.type]);
			if (!erasing) return;

			// Report the outermost cast rather than the whole property value, so a
			// `satisfies` wrapped around it stays put when the suggestion is applied.
			context.report({
				node: outermost,
				messageId: 'erasingCast',
				data: {
					typeName: ERASING_KEYWORDS[erasing.typeAnnotation.type],
					property,
				},
				suggest: [
					{
						messageId: 'removeCast',
						fix: (fixer) => casts.map((cast) => removeCastSyntax(fixer, cast)),
					},
				],
			});
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const descriptionValue = findNodeDescriptionObject(node);
				if (!descriptionValue) return;

				for (const prop of ['inputs', 'outputs'] as const) {
					const property =
						findObjectProperty(descriptionValue, prop) ?? findJsonProperty(descriptionValue, prop);
					if (!property) continue;
					checkProperty(property.value, prop);
				}
			},
		};
	},
});
