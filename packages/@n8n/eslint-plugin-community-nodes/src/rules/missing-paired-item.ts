/**
 * Flags object literals with a `json` property but no `pairedItem` property
 * inside `execute()` methods of `INodeType` classes.
 *
 * Missing `pairedItem` breaks downstream item-referencing expressions like
 * `$('NodeName').item`. This rule catches the three most common patterns:
 *
 * - Object literals in `.map()` callbacks
 * - Object literals passed to `.push()` calls
 * - Object literals in return statements (typically `return [[{ json }]]`)
 *
 * Only flags object literals directly — variable references are skipped since
 * their shape cannot be determined without type resolution.
 */

import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findObjectProperty,
	isFileType,
	isNodeTypeClass,
	isThisHelpersMethodCall,
} from '../utils/index.js';

/**
 * Checks whether the object is inside an array argument to
 * `this.helpers.constructExecutionMetaData()`, which adds pairedItem
 * via the second argument's `itemData` property.
 */
function isInsideConstructExecutionMetaData(node: TSESTree.ObjectExpression): boolean {
	// Pattern: constructExecutionMetaData([{ json: ... }], { itemData: ... })
	// Walk up: ObjectExpression -> ArrayExpression -> CallExpression
	const parent = node.parent;
	if (parent?.type !== AST_NODE_TYPES.ArrayExpression) return false;

	const grandparent = parent.parent;
	if (grandparent?.type !== AST_NODE_TYPES.CallExpression) return false;

	// Check it's the first argument
	if (grandparent.arguments[0] !== parent) return false;

	return isThisHelpersMethodCall(grandparent, 'constructExecutionMetaData');
}

export const MissingPairedItemRule = createRule({
	name: 'missing-paired-item',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require pairedItem on INodeExecutionData objects in execute() methods to preserve item linking.',
		},
		messages: {
			missingPairedItem:
				'Missing pairedItem on INodeExecutionData object. Add `pairedItem: { item: index }` to preserve item linking. See https://docs.n8n.io/integrations/creating-nodes/build/reference/paired-items/',
		},
		schema: [],
		hasSuggestions: false,
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		let inNodeTypeClass = false;
		let inExecuteMethod = false;

		return {
			ClassDeclaration(node) {
				if (isNodeTypeClass(node)) {
					inNodeTypeClass = true;
				}
			},

			'ClassDeclaration:exit'() {
				inNodeTypeClass = false;
				inExecuteMethod = false;
			},

			MethodDefinition(node: TSESTree.MethodDefinition) {
				if (
					inNodeTypeClass &&
					node.key.type === AST_NODE_TYPES.Identifier &&
					node.key.name === 'execute'
				) {
					inExecuteMethod = true;
				}
			},

			'MethodDefinition:exit'(node: TSESTree.MethodDefinition) {
				if (
					inExecuteMethod &&
					node.key.type === AST_NODE_TYPES.Identifier &&
					node.key.name === 'execute'
				) {
					inExecuteMethod = false;
				}
			},

			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (!inExecuteMethod) return;

				const hasJson = findObjectProperty(node, 'json') !== null;
				if (!hasJson) return;

				const hasPairedItem = findObjectProperty(node, 'pairedItem') !== null;
				if (hasPairedItem) return;

				// Skip if inside constructExecutionMetaData() — it adds pairedItem via itemData
				if (isInsideConstructExecutionMetaData(node)) return;

				// Skip if the object contains spread elements — they may already provide pairedItem
				const hasSpread = node.properties.some(
					(prop) => prop.type === AST_NODE_TYPES.SpreadElement,
				);
				if (hasSpread) return;

				// Only flag if this looks like an INodeExecutionData object literal —
				// must have `json` and optionally `binary`/`error`, nothing unexpected.
				// Objects with many unrelated keys are likely not INodeExecutionData.
				const knownKeys = new Set([
					'json',
					'binary',
					'error',
					'pairedItem',
					'executionStatus',
					'metadata',
					'evaluationData',
					'redaction',
					'sendMessage',
					'index',
				]);
				const allPropertiesKnown = node.properties.every(
					(prop) =>
						prop.type === AST_NODE_TYPES.Property &&
						prop.key.type === AST_NODE_TYPES.Identifier &&
						knownKeys.has(prop.key.name),
				);

				if (!allPropertiesKnown) return;

				context.report({ node, messageId: 'missingPairedItem' });
			},
		};
	},
});
