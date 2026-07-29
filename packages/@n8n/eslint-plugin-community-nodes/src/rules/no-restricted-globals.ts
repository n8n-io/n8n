import { TSESTree } from '@typescript-eslint/utils';
import type { TSESLint } from '@typescript-eslint/utils';

import { createRule } from '../utils/index.js';

const restrictedGlobals = [
	'clearInterval',
	'clearTimeout',
	'global',
	'globalThis',
	'process',
	'setInterval',
	'setTimeout',
	'setImmediate',
	'clearImmediate',
	'__dirname',
	'__filename',
];

// Nudge toward the n8n-workflow alternatives that work under n8n Cloud's restrictions
const restrictedGlobalHints: Record<string, string> = {
	setTimeout: "Use the 'sleep' helper from 'n8n-workflow' instead.",
	clearTimeout: "Use 'sleepWithAbort' from 'n8n-workflow' with an AbortSignal instead.",
};

export const NoRestrictedGlobalsRule = createRule({
	name: 'no-restricted-globals',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow usage of restricted global variables in community nodes.',
		},
		messages: {
			restrictedGlobal: "Use of restricted global '{{ name }}' is not allowed",
			restrictedGlobalWithHint: "Use of restricted global '{{ name }}' is not allowed. {{ hint }}",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		function checkReference(ref: TSESLint.Scope.Reference, name: string) {
			const { parent } = ref.identifier;

			// Skip property access (like console.process - we want process.exit but not obj.process)
			if (
				parent?.type === TSESTree.AST_NODE_TYPES.MemberExpression &&
				parent.property === ref.identifier &&
				!parent.computed
			) {
				return;
			}

			const hint = restrictedGlobalHints[name];

			context.report(
				hint
					? {
							node: ref.identifier,
							messageId: 'restrictedGlobalWithHint',
							data: { name, hint },
						}
					: {
							node: ref.identifier,
							messageId: 'restrictedGlobal',
							data: { name },
						},
			);
		}

		return {
			Program() {
				const globalScope = context.sourceCode.getScope(context.sourceCode.ast);

				const allReferences = [
					...globalScope.variables
						.filter(
							(variable) => restrictedGlobals.includes(variable.name) && variable.defs.length === 0, // No definitions means it's a global
						)
						.flatMap((variable) =>
							variable.references.map((ref) => ({ ref, name: variable.name })),
						),
					...globalScope.through
						.filter((ref) => restrictedGlobals.includes(ref.identifier.name))
						.map((ref) => ({ ref, name: ref.identifier.name })),
				];

				allReferences.forEach(({ ref, name }) => checkReference(ref, name));
			},
		};
	},
});
