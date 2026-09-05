import type { TSESTree, TSESLint } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { getTopLevelObjectInJson, isFileType, programImportsModule } from './ast-utils.js';
import { fileHasInlineDescriptionCodex, fileImportsModule } from './file-utils.js';

const AI_NODE_SDK_MODULE_NAMES = ['@n8n/ai-node-sdk', 'ai-node-sdk'];

/**
 * Returns an ESLint visitor that invokes `check` with every codex-like object
 * literal found in the linted file: the top-level object of a `.node.json`
 * codex file, or any inline `codex: {...}` object literal in a `.node.ts`
 * file, wherever it's nested (`description.codex`,
 * `usableAsTool.replacements.codex`, etc).
 *
 * A node built on n8n's AI Node SDK is exempt — the SDK requires proper AI
 * category/subcategory values to get built-in AI nodes correctly detected
 * and placed in the node panel, so restricting them here would break that.
 * This is checked per node file (not per package — a single package can mix
 * AI-SDK nodes with ordinary ones), by whether the `.node.ts` file imports
 * from the SDK; for a `.node.json` file, the check looks at its sibling
 * `.node.ts` file instead, since the JSON file has no imports of its own.
 */
export function createCodexObjectVisitor(
	context: Readonly<TSESLint.RuleContext<string, unknown[]>>,
	check: (codexObject: TSESTree.ObjectExpression) => void,
): TSESLint.RuleListener {
	if (isFileType(context.filename, '.node.json')) {
		const siblingNodeFile = context.filename.replace(/\.node\.json$/, '.node.ts');

		// n8n's node loader uses the sibling .node.ts's inline description.codex
		// as-is whenever it's set, and never even reads the .node.json codex in
		// that case (no field-by-field merge) — so this file's categories/
		// subcategories have no effect on the running node and aren't worth
		// linting.
		if (fileHasInlineDescriptionCodex(siblingNodeFile)) {
			return {};
		}

		if (fileImportsModule(siblingNodeFile, AI_NODE_SDK_MODULE_NAMES)) {
			return {};
		}

		return {
			ObjectExpression(node) {
				const root = getTopLevelObjectInJson(node);
				if (root) check(root);
			},
		};
	}

	if (!isFileType(context.filename, '.node.ts')) {
		return {};
	}

	if (programImportsModule(context.sourceCode.ast, AI_NODE_SDK_MODULE_NAMES)) {
		return {};
	}

	return {
		Property(node: TSESTree.Property) {
			if (
				node.key.type === AST_NODE_TYPES.Identifier &&
				node.key.name === 'codex' &&
				node.value.type === AST_NODE_TYPES.ObjectExpression
			) {
				check(node.value);
			}
		},
	};
}

/**
 * Finds a property by name on an object literal, regardless of whether the
 * key is an identifier (`categories: [...]`, as written inline in a
 * `.node.ts` file) or a string literal (`"categories": [...]`, as parsed from
 * a `.node.json` file).
 */
export function findCodexProperty(
	obj: TSESTree.ObjectExpression,
	propertyName: string,
): TSESTree.Property | null {
	const property = obj.properties.find(
		(prop) =>
			prop.type === AST_NODE_TYPES.Property &&
			((prop.key.type === AST_NODE_TYPES.Identifier && prop.key.name === propertyName) ||
				(prop.key.type === AST_NODE_TYPES.Literal && prop.key.value === propertyName)),
	);
	return property?.type === AST_NODE_TYPES.Property ? property : null;
}

type RemovableArrayElement = NonNullable<TSESTree.ArrayExpression['elements'][number]>;

// Extends `end` past any trailing horizontal whitespace, so removing a
// non-last element doesn't leave a stray space behind (e.g. `[ "b"]`).
function skipTrailingHorizontalWhitespace(sourceCode: TSESLint.SourceCode, end: number): number {
	const text = sourceCode.getText();
	while (end < text.length && (text[end] === ' ' || text[end] === '\t')) {
		end++;
	}
	return end;
}

/**
 * Removes a single element from an array literal, including whichever
 * adjacent comma keeps the remaining elements comma-separated.
 */
export function removeArrayElement(
	fixer: TSESLint.RuleFixer,
	sourceCode: TSESLint.SourceCode,
	elements: TSESTree.ArrayExpression['elements'],
	target: RemovableArrayElement,
): TSESLint.RuleFix {
	const remaining = elements.filter((el): el is RemovableArrayElement => el !== null);
	if (remaining.length === 1) {
		return fixer.remove(target);
	}

	const index = remaining.indexOf(target);
	if (index === remaining.length - 1) {
		const prevToken = sourceCode.getTokenBefore(target);
		if (!prevToken) return fixer.remove(target);
		return fixer.removeRange([prevToken.range[0], target.range[1]]);
	}

	const nextToken = sourceCode.getTokenAfter(target);
	if (!nextToken) return fixer.remove(target);
	return fixer.removeRange([
		target.range[0],
		skipTrailingHorizontalWhitespace(sourceCode, nextToken.range[1]),
	]);
}

/**
 * Removes a single property from an object literal, including whichever
 * adjacent comma keeps the remaining properties comma-separated.
 */
export function removeObjectProperty(
	fixer: TSESLint.RuleFixer,
	sourceCode: TSESLint.SourceCode,
	obj: TSESTree.ObjectExpression,
	target: TSESTree.Property,
): TSESLint.RuleFix {
	if (obj.properties.length === 1) {
		return fixer.remove(target);
	}

	const index = obj.properties.indexOf(target);
	if (index === obj.properties.length - 1) {
		const prevToken = sourceCode.getTokenBefore(target);
		if (!prevToken) return fixer.remove(target);
		return fixer.removeRange([prevToken.range[0], target.range[1]]);
	}

	const nextToken = sourceCode.getTokenAfter(target);
	if (!nextToken) return fixer.remove(target);
	return fixer.removeRange([
		target.range[0],
		skipTrailingHorizontalWhitespace(sourceCode, nextToken.range[1]),
	]);
}
