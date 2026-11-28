import { isRecord } from '@n8n/utils/is-record';
import {
	NodeHelpers,
	type INode,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';

type PropertySchema = INodeProperties | INodePropertyCollection | INodePropertyOptions;

function containsFilterProperty(property: PropertySchema): boolean {
	if ('type' in property) {
		if (property.type === 'filter') {
			return true;
		}
		if (
			(property.type === 'collection' || property.type === 'fixedCollection') &&
			Array.isArray(property.options)
		) {
			return property.options.some(containsFilterProperty);
		}
		return false;
	}

	if ('values' in property && Array.isArray(property.values)) {
		return property.values.some(containsFilterProperty);
	}

	return false;
}

function stripFilterConditionRightValue(condition: unknown): unknown {
	if (!isRecord(condition) || !('rightValue' in condition)) {
		return condition;
	}

	const { operator } = condition;
	if (!isRecord(operator) || operator.singleValue !== true) {
		return condition;
	}

	const { rightValue: _omitted, ...rest } = condition;
	return rest;
}

function stripSingleValueFilter(value: unknown): unknown {
	if (Array.isArray(value)) {
		let changed = false;
		const mapped = value.map((item) => {
			const next = stripSingleValueFilter(item);
			if (next !== item) {
				changed = true;
			}
			return next;
		});
		return changed ? mapped : value;
	}

	if (!isRecord(value) || !Array.isArray(value.conditions)) {
		return value;
	}

	let changed = false;
	const conditions = value.conditions.map((condition) => {
		const next = stripFilterConditionRightValue(condition);
		if (next !== condition) {
			changed = true;
		}
		return next;
	});

	return changed ? { ...value, conditions } : value;
}

function findMatchingChildProperty(
	children: PropertySchema[],
	key: string,
	currentValues: INodeParameters,
	node: INode,
	nodeTypeDescription: INodeTypeDescription,
): PropertySchema | undefined {
	const matches = children.filter((child) => child.name === key);
	if (matches.length === 0) {
		return undefined;
	}
	if (matches.length === 1) {
		return matches[0];
	}
	return matches.find((child) =>
		'values' in child
			? true
			: NodeHelpers.displayParameter(
					currentValues,
					child,
					node,
					nodeTypeDescription,
					node.parameters,
				),
	);
}

function stripContainerValue(
	value: unknown,
	children: PropertySchema[],
	node: INode,
	nodeTypeDescription: INodeTypeDescription,
): unknown {
	if (Array.isArray(value)) {
		let changed = false;
		const mapped = value.map((item) => {
			const next = stripContainerValue(item, children, node, nodeTypeDescription);
			if (next !== item) {
				changed = true;
			}
			return next;
		});
		return changed ? mapped : value;
	}

	if (!isRecord(value)) {
		return value;
	}

	let result: Record<string, unknown> | undefined;

	for (const [key, childValue] of Object.entries(value)) {
		const childProperty = findMatchingChildProperty(
			children,
			key,
			value as INodeParameters,
			node,
			nodeTypeDescription,
		);
		if (!childProperty || !containsFilterProperty(childProperty)) {
			continue;
		}

		const strippedChild = stripValueByProperty(
			childValue,
			childProperty,
			node,
			nodeTypeDescription,
		);
		if (strippedChild !== childValue) {
			result ??= { ...value };
			result[key] = strippedChild;
		}
	}

	return result ?? value;
}

function stripValueByProperty(
	value: unknown,
	property: PropertySchema,
	node: INode,
	nodeTypeDescription: INodeTypeDescription,
): unknown {
	if ('type' in property) {
		if (property.type === 'filter') {
			return stripSingleValueFilter(value);
		}
		if (
			(property.type === 'collection' || property.type === 'fixedCollection') &&
			Array.isArray(property.options)
		) {
			return stripContainerValue(value, property.options, node, nodeTypeDescription);
		}
		return value;
	}

	if ('values' in property && Array.isArray(property.values)) {
		return stripContainerValue(value, property.values, node, nodeTypeDescription);
	}

	return value;
}

/**
 * Omit hidden `rightValue` fields on single-value conditions inside `type: 'filter'` parameters
 * before expression resolution, without mutating `node.parameters`.
 */
export function omitHiddenFilterRightValues(
	value: NodeParameterValueType,
	parameterName: string,
	node: INode,
	nodeType: INodeType | undefined,
): NodeParameterValueType {
	if (
		(!isRecord(value) && !Array.isArray(value)) ||
		!Array.isArray(nodeType?.description?.properties)
	) {
		return value;
	}

	if (!nodeType.description.properties.some(containsFilterProperty)) {
		return value;
	}

	const property = NodeHelpers.findDisplayedProperty(
		parameterName,
		nodeType.description.properties,
		node.parameters,
		node,
		nodeType.description,
	);
	if (!property || !containsFilterProperty(property)) {
		return value;
	}

	return stripValueByProperty(
		value,
		property,
		node,
		nodeType.description,
	) as NodeParameterValueType;
}
