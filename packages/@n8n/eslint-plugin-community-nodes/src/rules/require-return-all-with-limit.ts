import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findArrayLiteralProperty,
	findNodeDescriptionObject,
	findObjectProperty,
	getBooleanLiteralValue,
	getPropertyKeyName,
	getStringLiteralValue,
	isFileType,
	isNodeTypeClass,
} from '../utils/index.js';

function getShow(property: TSESTree.ObjectExpression): TSESTree.ObjectExpression | null {
	const displayOptions = findObjectProperty(property, 'displayOptions')?.value;
	if (displayOptions?.type !== AST_NODE_TYPES.ObjectExpression) return null;

	const show = findObjectProperty(displayOptions, 'show')?.value;
	return show?.type === AST_NODE_TYPES.ObjectExpression ? show : null;
}

function hasSameConditions(
	left: TSESTree.ObjectExpression,
	right: TSESTree.ObjectExpression,
): boolean {
	const conditions = (property: TSESTree.ObjectExpression) =>
		(getShow(property)?.properties ?? []).filter(
			(condition) =>
				condition.type !== AST_NODE_TYPES.Property || getPropertyKeyName(condition) !== 'returnAll',
		);
	const leftConditions = conditions(left);
	const rightConditions = conditions(right);
	if (leftConditions.length !== rightConditions.length) return false;

	return leftConditions.every((condition) => {
		if (condition.type !== AST_NODE_TYPES.Property) return false;
		const key = getPropertyKeyName(condition);
		const other = rightConditions.find(
			(candidate) =>
				candidate.type === AST_NODE_TYPES.Property && getPropertyKeyName(candidate) === key,
		);
		if (
			key === null ||
			other?.type !== AST_NODE_TYPES.Property ||
			condition.value.type !== AST_NODE_TYPES.ArrayExpression ||
			other.value.type !== AST_NODE_TYPES.ArrayExpression
		) {
			return false;
		}

		const otherValues = other.value.elements;
		return (
			condition.value.elements.length === otherValues.length &&
			condition.value.elements.every(
				(value) =>
					value?.type === AST_NODE_TYPES.Literal &&
					otherValues.some(
						(otherValue) =>
							otherValue?.type === AST_NODE_TYPES.Literal && otherValue.value === value.value,
					),
			)
		);
	});
}

export const RequireReturnAllWithLimitRule = createRule({
	name: 'require-return-all-with-limit',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Require a Return All companion and visibility gate for Limit properties',
		},
		messages: {
			missingCompanion:
				'`Limit` has no `Return All` companion. List operations should offer `Return All` so users are not silently capped at the default.',
			ungatedLimit:
				'`Limit` is always visible. It should be gated on `displayOptions: { show: { returnAll: [false] } }` so it disappears when Return All is on.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		function checkProperties(array: TSESTree.ArrayExpression): void {
			const properties = array.elements.filter(
				(property): property is TSESTree.ObjectExpression =>
					property?.type === AST_NODE_TYPES.ObjectExpression,
			);
			const nameOf = (property: TSESTree.ObjectExpression) =>
				getStringLiteralValue(findObjectProperty(property, 'name')?.value ?? null);
			const reportedCompanions = new Set<TSESTree.ObjectExpression>();

			for (const limit of properties) {
				if (nameOf(limit) !== 'limit') continue;

				const companion = properties.find(
					(property) => nameOf(property) === 'returnAll' && hasSameConditions(limit, property),
				);
				if (!companion) {
					context.report({ node: limit, messageId: 'missingCompanion' });
				}

				const show = getShow(limit);
				const gate = show ? findObjectProperty(show, 'returnAll')?.value : undefined;
				if (
					gate?.type === AST_NODE_TYPES.ArrayExpression &&
					gate.elements.length === 1 &&
					getBooleanLiteralValue(gate.elements[0] ?? null) === false
				) {
					continue;
				}

				context.report({ node: limit, messageId: 'ungatedLimit' });
				if (companion && !gate && !reportedCompanions.has(companion)) {
					const gatedFields = properties.filter((property) => {
						const otherShow = getShow(property);
						return (
							otherShow !== null &&
							findObjectProperty(otherShow, 'returnAll') !== null &&
							hasSameConditions(limit, property)
						);
					});
					if (
						gatedFields.length > 0 &&
						gatedFields.every((property) => nameOf(property) !== 'limit')
					) {
						context.report({ node: companion, messageId: 'ungatedLimit' });
						reportedCompanions.add(companion);
					}
				}
			}
		}

		return {
			ClassDeclaration(node) {
				if (!isFileType(context.filename, '.node.ts') || !isNodeTypeClass(node)) return;
				const description = findNodeDescriptionObject(node);
				const properties = description && findArrayLiteralProperty(description, 'properties');
				if (properties) checkProperties(properties);
			},
			VariableDeclarator(node) {
				if (
					node.parent.parent.type !== AST_NODE_TYPES.ExportNamedDeclaration ||
					node.id.type !== AST_NODE_TYPES.Identifier ||
					node.init?.type !== AST_NODE_TYPES.ArrayExpression
				) {
					return;
				}
				const annotation = node.id.typeAnnotation?.typeAnnotation;
				if (
					annotation?.type === AST_NODE_TYPES.TSArrayType &&
					annotation.elementType.type === AST_NODE_TYPES.TSTypeReference &&
					annotation.elementType.typeName.type === AST_NODE_TYPES.Identifier &&
					annotation.elementType.typeName.name === 'INodeProperties'
				) {
					checkProperties(node.init);
				}
			},
		};
	},
});
