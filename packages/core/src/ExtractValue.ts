import type {
	FilterConditionValue,
	FilterTypeOptions,
	FilterValue,
	INode,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
	NodeParameterValueType,
} from 'n8n-workflow';
import { NodeOperationError, NodeHelpers, LoggerProxy, validateFieldType } from 'n8n-workflow';
import type { DateTime } from 'luxon';

function findPropertyFromParameterName(
	parameterName: string,
	nodeType: INodeType,
	node: INode,
	nodeParameters: INodeParameters,
): INodePropertyOptions | INodeProperties | INodePropertyCollection {
	let property: INodePropertyOptions | INodeProperties | INodePropertyCollection | undefined;
	const paramParts = parameterName.split('.');
	let currentParamPath = '';

	const findProp = (
		name: string,
		options: Array<INodePropertyOptions | INodeProperties | INodePropertyCollection>,
	): INodePropertyOptions | INodeProperties | INodePropertyCollection | undefined => {
		return options.find(
			(i) =>
				i.name === name &&
				NodeHelpers.displayParameterPath(nodeParameters, i, currentParamPath, node),
		);
	};

	for (const p of paramParts) {
		const param = p.split('[')[0];
		if (!property) {
			property = findProp(param, nodeType.description.properties);
		} else if ('options' in property && property.options) {
			property = findProp(param, property.options);
			currentParamPath += `.${param}`;
		} else if ('values' in property) {
			property = findProp(param, property.values);
			currentParamPath += `.${param}`;
		} else {
			throw new Error(`Couldn't not find property "${parameterName}"`);
		}
		if (!property) {
			throw new Error(`Couldn't not find property "${parameterName}"`);
		}
	}
	if (!property) {
		throw new Error(`Couldn't not find property "${parameterName}"`);
	}

	return property;
}

function executeRegexExtractValue(
	value: string,
	regex: RegExp,
	parameterName: string,
	parameterDisplayName: string,
): NodeParameterValueType | object {
	const extracted = regex.exec(value);
	if (!extracted) {
		throw new Error(
			`ERROR: ${parameterDisplayName} parameter's value is invalid. This is likely because the URL entered is incorrect`,
		);
	}
	if (extracted.length < 2 || extracted.length > 2) {
		throw new Error(
			`Property "${parameterName}" has an invalid extractValue regex "${regex.source}". extractValue expects exactly one group to be returned.`,
		);
	}
	return extracted[1];
}

function extractValueRLC(
	value: NodeParameterValueType | object,
	property: INodeProperties,
	parameterName: string,
): NodeParameterValueType | object {
	// Not an RLC value
	if (typeof value !== 'object' || !value || !('mode' in value) || !('value' in value)) {
		return value;
	}
	const modeProp = (property.modes ?? []).find((i) => i.name === value.mode);
	if (!modeProp) {
		return value.value;
	}
	if (!('extractValue' in modeProp) || !modeProp.extractValue) {
		return value.value;
	}

	if (typeof value.value !== 'string') {
		let typeName: string | undefined = value.value?.constructor.name;
		if (value.value === null) {
			typeName = 'null';
		} else if (typeName === undefined) {
			typeName = 'undefined';
		}
		LoggerProxy.error(
			`Only strings can be passed to extractValue. Parameter "${parameterName}" passed "${typeName}"`,
		);
		throw new Error(
			`ERROR: ${property.displayName} parameter's value is invalid. Please enter a valid ${modeProp.displayName}.`,
		);
	}

	if (modeProp.extractValue.type !== 'regex') {
		throw new Error(
			`Property "${parameterName}" has an unknown extractValue type "${
				modeProp.extractValue.type as string
			}"`,
		);
	}

	const regex = new RegExp(modeProp.extractValue.regex);
	return executeRegexExtractValue(value.value, regex, parameterName, property.displayName);
}

function executeFilterCondition(
	condition: FilterConditionValue,
	options?: FilterTypeOptions,
): boolean {
	switch (condition.operator.type) {
		case 'any': {
			const exists = condition.leftValue !== undefined && condition.leftValue !== null;

			switch (condition.operator.operation) {
				case 'exists':
					return exists;
				case 'notExists':
					return !exists;
			}

			break;
		}
		case 'string': {
			const parsedLeftValue = validateFieldType(
				'filter',
				condition.leftValue,
				condition.operator.type,
			);
			const parsedRightValue = validateFieldType(
				'filter',
				condition.rightValue,
				condition.operator.type,
			);

			if (!parsedLeftValue.valid || !parsedRightValue.valid) {
				return false;
			}

			let leftValue = parsedLeftValue.newValue as string;
			let rightValue = parsedRightValue.newValue as string;

			if (options?.caseSensitive === false) {
				leftValue = leftValue.toLocaleLowerCase();
				rightValue = rightValue.toLocaleLowerCase();
			}

			switch (condition.operator.operation) {
				case 'equals':
					return leftValue === rightValue;
				case 'notEquals':
					return leftValue !== rightValue;
				case 'contains':
					return leftValue.includes(rightValue);
				case 'notContains':
					return !leftValue.includes(rightValue);
				case 'startsWith':
					return leftValue.startsWith(rightValue);
				case 'notStartsWith':
					return !leftValue.startsWith(rightValue);
				case 'endsWith':
					return leftValue.endsWith(rightValue);
				case 'notEndsWith':
					return !leftValue.endsWith(rightValue);
				case 'notEndsWith':
					return !leftValue.endsWith(rightValue);
				case 'regex':
					return new RegExp(rightValue).test(leftValue);
				case 'notRegex':
					return !new RegExp(rightValue).test(leftValue);
			}

			break;
		}
		case 'number': {
			const parsedLeftValue = validateFieldType(
				'filter',
				condition.leftValue,
				condition.operator.type,
			);
			const parsedRightValue = validateFieldType(
				'filter',
				condition.rightValue,
				condition.operator.type,
			);

			if (!parsedLeftValue.valid || !parsedRightValue.valid) {
				return false;
			}

			const leftValue = parsedLeftValue.newValue as number;
			const rightValue = parsedRightValue.newValue as number;

			switch (condition.operator.operation) {
				case 'equals':
					return leftValue === rightValue;
				case 'notEquals':
					return leftValue !== rightValue;
				case 'gt':
					return leftValue > rightValue;
				case 'lt':
					return leftValue < rightValue;
				case 'gte':
					return leftValue >= rightValue;
				case 'lte':
					return leftValue <= rightValue;
			}
		}
		case 'dateTime': {
			const parsedLeftValue = validateFieldType(
				'filter',
				condition.leftValue,
				condition.operator.type,
			);
			const parsedRightValue = validateFieldType(
				'filter',
				condition.rightValue,
				condition.operator.type,
			);

			if (!parsedLeftValue.valid || !parsedRightValue.valid) {
				return false;
			}

			const leftValue = parsedLeftValue.newValue as DateTime;
			const rightValue = parsedRightValue.newValue as DateTime;

			switch (condition.operator.operation) {
				case 'equals':
					return leftValue.toMillis() === rightValue.toMillis();
				case 'notEquals':
					return leftValue.toMillis() !== rightValue.toMillis();
				case 'after':
					return leftValue.toMillis() > rightValue.toMillis();
				case 'before':
					return leftValue.toMillis() < rightValue.toMillis();
				case 'afterOrEquals':
					return leftValue.toMillis() >= rightValue.toMillis();
				case 'beforeOrEquals':
					return leftValue.toMillis() <= rightValue.toMillis();
			}
		}
		case 'boolean': {
			const parsedLeftValue = validateFieldType(
				'filter',
				condition.leftValue,
				condition.operator.type,
			);
			const parsedRightValue = validateFieldType(
				'filter',
				condition.rightValue,
				condition.operator.type,
			);

			if (!parsedLeftValue.valid || !parsedRightValue.valid) {
				return false;
			}

			const leftValue = parsedLeftValue.newValue as boolean;
			const rightValue = parsedRightValue.newValue as boolean;

			switch (condition.operator.operation) {
				case 'true':
					return leftValue;
				case 'false':
					return !leftValue;
				case 'equals':
					return leftValue === rightValue;
				case 'notEquals':
					return leftValue !== rightValue;
			}
		}
		case 'array': {
			const parsedLeftValue = validateFieldType(
				'filter',
				condition.leftValue,
				condition.operator.type,
			);
			const parsedRightValue = validateFieldType(
				'filter',
				condition.rightValue,
				condition.operator.type,
			);

			if (!parsedLeftValue.valid || !parsedRightValue.valid) {
				return false;
			}

			const leftValue = parsedLeftValue.newValue as unknown[];
			const rightValue = parsedRightValue.newValue as unknown[];

			switch (condition.operator.operation) {
				case 'contains':
					return rightValue.some((item) => leftValue.includes(item));
				case 'notContains':
					return !rightValue.some((item) => leftValue.includes(item));
				case 'lengthEquals':
					return leftValue.length === rightValue.length;
				case 'lengthNotEquals':
					return leftValue.length !== rightValue.length;
				case 'lengthGt':
					return leftValue.length > rightValue.length;
				case 'lengthLt':
					return leftValue.length < rightValue.length;
				case 'lengthGte':
					return leftValue.length >= rightValue.length;
				case 'lengthLte':
					return leftValue.length <= rightValue.length;
			}
		}
		case 'object': {
			const parsedLeftValue = validateFieldType(
				'filter',
				condition.leftValue,
				condition.operator.type,
			);

			if (!parsedLeftValue.valid) {
				return false;
			}

			const leftValue = parsedLeftValue.newValue as object;

			switch (condition.operator.operation) {
				case 'empty':
					return Object.keys(leftValue).length === 0;
				case 'notEmpty':
					return Object.keys(leftValue).length !== 0;
			}
		}
	}

	LoggerProxy.error(
		`Unknown filter parameter operator "${condition.operator.type}:${condition.operator.operation}"`,
	);
	return false;
}

function extractValueFilter(
	value: NodeParameterValueType | object,
	property: INodeProperties,
	parameterName: string,
): NodeParameterValueType | object {
	if (typeof value !== 'object' || !value || !('conditions' in value)) {
		return value;
	}

	if (property.extractValue?.type) {
		throw new Error(
			`Property "${parameterName}" has an invalid extractValue type. Filter parameters only support extractValue: true`,
		);
	}

	const filterValue = value as FilterValue;

	if (filterValue.combinator === 'and') {
		return filterValue.conditions.every((condition) =>
			executeFilterCondition(condition, property.typeOptions?.filter),
		);
	} else if (filterValue.combinator === 'or') {
		return filterValue.conditions.some((condition) =>
			executeFilterCondition(condition, property.typeOptions?.filter),
		);
	}

	return false;
}

function extractValueOther(
	value: NodeParameterValueType | object,
	property: INodeProperties | INodePropertyCollection,
	parameterName: string,
): NodeParameterValueType | object {
	if (!('extractValue' in property) || !property.extractValue) {
		return value;
	}

	if (typeof value !== 'string') {
		let typeName: string | undefined = value?.constructor.name;
		if (value === null) {
			typeName = 'null';
		} else if (typeName === undefined) {
			typeName = 'undefined';
		}
		LoggerProxy.error(
			`Only strings can be passed to extractValue. Parameter "${parameterName}" passed "${typeName}"`,
		);
		throw new Error(
			`ERROR: ${property.displayName} parameter's value is invalid. Please enter a valid value.`,
		);
	}

	if (property.extractValue.type !== 'regex') {
		throw new Error(
			`Property "${parameterName}" has an unknown extractValue type "${
				property.extractValue.type as string
			}"`,
		);
	}

	const regex = new RegExp(property.extractValue.regex);
	return executeRegexExtractValue(value, regex, parameterName, property.displayName);
}

export function extractValue(
	value: NodeParameterValueType | object,
	parameterName: string,
	node: INode,
	nodeType: INodeType,
): NodeParameterValueType | object {
	let property: INodePropertyOptions | INodeProperties | INodePropertyCollection;
	try {
		property = findPropertyFromParameterName(parameterName, nodeType, node, node.parameters);

		// Definitely doesn't have value extractor
		if (!('type' in property)) {
			return value;
		}

		if (property.type === 'resourceLocator') {
			return extractValueRLC(value, property, parameterName);
		} else if (property.type === 'filter') {
			return extractValueFilter(value, property, parameterName);
		}
		return extractValueOther(value, property, parameterName);
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		throw new NodeOperationError(node, error);
	}
}
