import type { CreateRule, ESTree, SourceCode } from '@oxlint/plugins';

import createPaddingLineRule from '../vendor/eslint-stylistic/padding-line-between-statements.js';

import type { NodeTestObject } from '../vendor/eslint-stylistic/padding-line-between-statements.js';

/** A `const`/`let`/`var`/`using` declaration, optionally exported, written on one line. */
function isSinglelineBinding(node: ESTree.Node): boolean {
	const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
	return declaration?.type === 'VariableDeclaration' && node.loc.start.line === node.loc.end.line;
}

/** Comments above a statement belong to it; a comment trailing the previous line does not. */
function hasLeadingComment(node: ESTree.Node, sourceCode: SourceCode): boolean {
	const previousLine = sourceCode.getTokenBefore(node)?.loc.end.line;
	return sourceCode
		.getCommentsBefore(node)
		.some((comment) => comment.loc.start.line !== previousLine);
}

const singlelineBinding: NodeTestObject = {
	test: (node) => isSinglelineBinding(node),
};

const undocumentedSinglelineBinding: NodeTestObject = {
	test: (node, sourceCode) => isSinglelineBinding(node) && !hasLeadingComment(node, sourceCode),
};

const paddingRule = createPaddingLineRule(
	[
		{ blankLine: 'always', prev: 'import', next: '*' },
		{ blankLine: 'always', prev: '*', next: { selector: 'Program > :not(ImportDeclaration)' } },
		{ blankLine: 'always', prev: { selector: 'Program > :not(ImportDeclaration)' }, next: '*' },
		{ blankLine: 'always', prev: '*', next: ['function', 'class', 'interface', 'type'] },
		{ blankLine: 'always', prev: ['function', 'class', 'interface', 'type'], next: '*' },
		{
			blankLine: 'always',
			prev: '*',
			next: ['multiline-const', 'multiline-let', 'multiline-var', 'multiline-using'],
		},
		{
			blankLine: 'always',
			prev: ['multiline-const', 'multiline-let', 'multiline-var', 'multiline-using'],
			next: '*',
		},
		{
			blankLine: 'always',
			prev: '*',
			next: ['return', 'if', 'switch', 'try', 'for', 'while', 'do'],
		},
		{ blankLine: 'always', prev: 'block-like', next: '*' },
		{ blankLine: 'any', prev: 'import', next: 'import' },
		// Consecutive single-line bindings form one group at any scope, including
		// module scope. A binding with its own leading comment starts a new group.
		{ blankLine: 'any', prev: 'singleline-binding', next: 'undocumented-singleline-binding' },
		{
			blankLine: 'any',
			prev: {
				selector:
					':matches(TSDeclareFunction, ExportNamedDeclaration[declaration.type="TSDeclareFunction"])',
			},
			next: {
				selector:
					':matches(TSDeclareFunction, FunctionDeclaration, ExportNamedDeclaration[declaration.type="TSDeclareFunction"], ExportNamedDeclaration[declaration.type="FunctionDeclaration"])',
			},
		},
	],
	{
		'singleline-binding': singlelineBinding,
		'undocumented-singleline-binding': undocumentedSinglelineBinding,
	},
);

/** Restore structural blank lines with whitespace-only fixes; keep single-line binding groups and overloads grouped. */
export const requireReadableSpacingRule: CreateRule = {
	...paddingRule,
	meta: {
		...paddingRule.meta,
		docs: {
			description: 'Require readable spacing between declarations and logical statement groups.',
		},
		schema: [],
	},
};
