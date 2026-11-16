import { readFileSync } from 'node:fs';
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

/**
 * Port of `vue/require-macro-variable-name`, with the names that
 * `@n8n/eslint-config/frontend` uses, so that Oxlint can enforce it.
 *
 * Oxlint runs a JS rule once for each script block of an SFC, and gives it
 * only the text of that block. Like the original, this rule checks only the
 * `<script setup>` block, so it reads the SFC to find out which block it got.
 */
const VARIABLE_NAME_BY_MACRO: Record<string, string> = {
	defineProps: 'props',
	defineEmits: 'emit',
	defineSlots: 'slots',
	useSlots: 'slots',
	useAttrs: 'attrs',
};

// A quoted attribute value can hold `>`, as in `generic="T extends Record<string, unknown>"`.
const SCRIPT_BLOCK = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/gi;
const QUOTED_VALUE = /"[^"]*"|'[^']*'/g;
const SETUP_ATTRIBUTE = /(?:^|\s)setup(?=[\s=]|$)/;

/** Exported for tests. */
export const isScriptSetupBlock = (sfc: string, scriptText: string) =>
	[...sfc.matchAll(SCRIPT_BLOCK)].some(
		([, attributes, content]) =>
			SETUP_ATTRIBUTE.test(attributes.replace(QUOTED_VALUE, '""')) &&
			content.trim() === scriptText.trim(),
	);

export const RequireMacroVariableNameRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require a fixed variable name for the result of a Vue macro.',
		},
		messages: {
			requireName: 'The variable name of "{{macroName}}" must be "{{variableName}}".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.vue')) return {};

		const sfc = readFileSync(context.physicalFilename, 'utf8');
		if (!isScriptSetupBlock(sfc, context.sourceCode.text)) return {};

		return {
			VariableDeclarator(node) {
				if (
					node.id.type !== TSESTree.AST_NODE_TYPES.Identifier ||
					node.init?.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
					node.init.callee.type !== TSESTree.AST_NODE_TYPES.Identifier
				) {
					return;
				}

				const callee = node.init.callee.name;
				const macroName = callee === 'withDefaults' ? 'defineProps' : callee;
				const variableName = VARIABLE_NAME_BY_MACRO[macroName];
				if (variableName === undefined || node.id.name === variableName) return;

				context.report({
					node: node.id,
					messageId: 'requireName',
					data: { macroName, variableName },
				});
			},
		};
	},
});
