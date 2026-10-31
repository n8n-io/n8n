import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findObjectProperty,
	getStringLiteralValue,
	isCredentialTypeClass,
	isFileType,
} from '../utils/index.js';

const PROMOTIONAL_PATTERNS = [
	/\b(?:plan\s+or\s+above|requires\s+the(?:\s+[\w-]+)*\s+plan|upgrade\s+to|premium|pro\s+plan|enterprise)\b/i,
	/\b(?:pricing|sign\s+up|start\s+your\s+free\s+trial|per\s+month|discount\s+codes?|contact\s+us\s+for|contact\s+sales)\b/i,
	/\bhttps?:\/\/[^/\s"'<>]+\/[^?#\s"'<>]*(?:pricing|signup|upgrade|billing)/i,
];

function isExportedProperties(node: TSESTree.Node): boolean {
	if (
		node.type !== AST_NODE_TYPES.VariableDeclarator ||
		node.parent.parent.type !== AST_NODE_TYPES.ExportNamedDeclaration
	) {
		return false;
	}

	const annotation = node.id.typeAnnotation?.typeAnnotation;
	return (
		annotation?.type === AST_NODE_TYPES.TSArrayType &&
		annotation.elementType.type === AST_NODE_TYPES.TSTypeReference &&
		annotation.elementType.typeName.type === AST_NODE_TYPES.Identifier &&
		annotation.elementType.typeName.name === 'INodeProperties'
	);
}

export const NoPromotionalNoticesRule = createRule({
	name: 'no-promotional-notices',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow promotional copy in node notices',
		},
		messages: {
			promotionalNotice:
				"Notice `{{ name }}` contains promotional copy. Node parameters are not a place for pricing, sign-up or plan-upgrade messaging. Remove it; if the user genuinely needs to know a capability is plan-gated, state that factually in the related field's `description`.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (isFileType(context.filename, '.credentials.ts')) return {};

		return {
			ObjectExpression(node) {
				const type = findObjectProperty(node, 'type');
				if (getStringLiteralValue(type?.value ?? null) !== 'notice') return;

				const ancestors = context.sourceCode.getAncestors(node);
				if (
					ancestors.some(
						(ancestor) =>
							ancestor.type === AST_NODE_TYPES.ClassDeclaration && isCredentialTypeClass(ancestor),
					) ||
					(!isFileType(context.filename, '.node.ts') && !ancestors.some(isExportedProperties))
				) {
					return;
				}

				const displayName = findObjectProperty(node, 'displayName');
				const value = displayName?.value;
				const name =
					value?.type === AST_NODE_TYPES.TemplateLiteral && value.expressions.length === 0
						? (value.quasis[0]?.value.cooked ?? null)
						: getStringLiteralValue(value ?? null);
				if (
					!displayName ||
					name === null ||
					!PROMOTIONAL_PATTERNS.some((pattern) => pattern.test(name))
				) {
					return;
				}

				context.report({
					node: displayName.value,
					messageId: 'promotionalNotice',
					data: { name },
				});
			},
		};
	},
});
