import get from 'lodash/get';
import {
	ApplicationError,
	LoggerProxy,
	NodeHelpers,
	NodeOperationError,
	WorkflowOperationError,
	executeFilter,
	isFilterValue,
	type INode,
	type INodeParameters,
	type INodeProperties,
	type INodePropertyCollection,
	type INodePropertyOptions,
	type INodeType,
	type NodeParameterValueType,
} from 'n8n-workflow';

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
				NodeHelpers.displayParameterPath(
					nodeParameters,
					i,
					currentParamPath,
					node,
					nodeType.description,
				),
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
			throw new ApplicationError('Could not find property', { extra: { parameterName } });
		}
		if (!property) {
			throw new ApplicationError('Could not find property', { extra: { parameterName } });
		}
	}
	if (!property) {
		throw new ApplicationError('Could not find property', { extra: { parameterName } });
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
		throw new WorkflowOperationError(
			`ERROR: ${parameterDisplayName} parameter's value is invalid. This is likely because the URL entered is incorrect`,
		);
	}
	if (extracted.length < 2 || extracted.length > 2) {
		throw new WorkflowOperationError(
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
		throw new ApplicationError(
			"ERROR: This parameter's value is invalid. Please enter a valid mode.",
			{ extra: { parameter: property.displayName, modeProp: modeProp.displayName } },
		);
	}

	if (modeProp.extractValue.type !== 'regex') {
		throw new ApplicationError('Property with unknown `extractValue`', {
			extra: { parameter: parameterName, extractValueType: modeProp.extractValue.type },
		});
	}

	const regex = new RegExp(modeProp.extractValue.regex);
	return executeRegexExtractValue(value.value, regex, parameterName, property.displayName);
}

function extractValueFilter(
	value: NodeParameterValueType | object,
	property: INodeProperties,
	parameterName: string,
	itemIndex: number,
): NodeParameterValueType | object {
	if (!isFilterValue(value)) {
		return value;
	}

	if (property.extractValue?.type) {
		throw new ApplicationError(
			`Property "${parameterName}" has an invalid extractValue type. Filter parameters only support extractValue: true`,
			{ extra: { parameter: parameterName } },
		);
	}

	return executeFilter(value, { itemIndex });
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
		throw new ApplicationError("This parameter's value is invalid", {
			extra: { parameter: property.displayName },
		});
	}

	if (property.extractValue.type !== 'regex') {
		throw new ApplicationError('Property with unknown `extractValue`', {
			extra: { parameter: parameterName, extractValueType: property.extractValue.type },
		});
	}

	const regex = new RegExp(property.extractValue.regex);
	return executeRegexExtractValue(value, regex, parameterName, property.displayName);
}

export function extractValue(
	value: NodeParameterValueType | object,
	parameterName: string,
	node: INode,
	nodeType: INodeType,
	itemIndex = 0,
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
			return extractValueFilter(value, property, parameterName, itemIndex);
		}
		return extractValueOther(value, property, parameterName);
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
		throw new NodeOperationError(node, error, { description: get(error, 'description') });
	}
}
