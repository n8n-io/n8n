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

function getStaticProperties(
	object: TSESTree.ObjectExpression,
): Map<string, TSESTree.Property> | undefined {
	const properties = new Map<string, TSESTree.Property>();
	for (const property of object.properties) {
		if (property.type !== AST_NODE_TYPES.Property || property.kind !== 'init' || property.method) {
			return undefined;
		}
		const key = getPropertyKeyName(property);
		if (key === null) return undefined;
		properties.set(key, property);
	}
	return properties;
}

// An empty map means no show conditions. Undefined means the conditions are unknown.
function getShow(property: TSESTree.ObjectExpression): Map<string, TSESTree.Property> | undefined {
	const properties = getStaticProperties(property);
	if (!properties) return undefined;
	const displayOptions = properties.get('displayOptions')?.value;
	if (!displayOptions) return new Map();
	if (displayOptions.type !== AST_NODE_TYPES.ObjectExpression) return undefined;

	const displayProperties = getStaticProperties(displayOptions);
	if (!displayProperties) return undefined;
	const show = displayProperties.get('show')?.value;
	if (!show) return new Map();
	return show.type === AST_NODE_TYPES.ObjectExpression ? getStaticProperties(show) : undefined;
}

function serializeConditionValue(node: TSESTree.Node | null): string | undefined {
	if (node?.type === AST_NODE_TYPES.Literal) {
		if (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value)) {
			return JSON.stringify(node.value);
		}
	}
	if (
		node?.type === AST_NODE_TYPES.UnaryExpression &&
		(node.operator === '-' || node.operator === '+') &&
		node.argument.type === AST_NODE_TYPES.Literal &&
		typeof node.argument.value === 'number'
	) {
		return JSON.stringify(node.operator === '-' ? -node.argument.value : node.argument.value);
	}
	if (node?.type === AST_NODE_TYPES.ArrayExpression) {
		const values = node.elements.map(serializeConditionValue);
		return values.includes(undefined) ? undefined : `[${values.join(',')}]`;
	}
	if (node?.type === AST_NODE_TYPES.ObjectExpression) {
		const properties = getStaticProperties(node);
		if (!properties) return undefined;
		const entries: string[] = [];
		for (const [key, property] of properties) {
			const value = serializeConditionValue(property.value);
			if (value === undefined) return undefined;
			entries.push(`${JSON.stringify(key)}:${value}`);
		}
		return `{${entries.sort().join(',')}}`;
	}
	return undefined;
}

function getConditions(property: TSESTree.ObjectExpression): Map<string, string> | undefined {
	const show = getShow(property);
	if (!show) return undefined;
	const conditions = new Map<string, string>();
	for (const [key, condition] of show) {
		if (key === 'returnAll') continue;
		if (condition.value.type !== AST_NODE_TYPES.ArrayExpression) return undefined;
		const values = condition.value.elements.map(serializeConditionValue);
		if (values.includes(undefined)) return undefined;
		// Show values are alternatives. Arrays inside a condition keep their order.
		conditions.set(key, JSON.stringify([...new Set(values)].sort()));
	}
	return conditions;
}

function hasSameConditions(
	left: TSESTree.ObjectExpression,
	right: TSESTree.ObjectExpression,
): boolean | undefined {
	const leftConditions = getConditions(left);
	const rightConditions = getConditions(right);
	if (!leftConditions || !rightConditions) return undefined;
	return (
		leftConditions.size === rightConditions.size &&
		[...leftConditions].every(([key, value]) => rightConditions.get(key) === value)
	);
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

				const companions = properties.filter((property) => nameOf(property) === 'returnAll');
				const companion = companions.find(
					(property) => hasSameConditions(limit, property) === true,
				);
				if (
					!companion &&
					getConditions(limit) !== undefined &&
					companions.every((property) => hasSameConditions(limit, property) === false)
				) {
					context.report({ node: limit, messageId: 'missingCompanion' });
				}

				const show = getShow(limit);
				if (!show) continue;
				const gate = show.get('returnAll')?.value;
				if (gate && serializeConditionValue(gate) === undefined) continue;
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
							otherShow?.has('returnAll') === true && hasSameConditions(limit, property) === true
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
