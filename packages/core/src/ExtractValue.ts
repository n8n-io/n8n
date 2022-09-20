import {
	INode,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
	NodeOperationError,
	NodeParameterValueType,
	NodeHelpers,
	LoggerProxy,
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
				NodeHelpers.displayParameterPath(nodeParameters, i, currentParamPath, node),
		);
	};

	// eslint-disable-next-line no-restricted-syntax
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
		}
		return extractValueOther(value, property, parameterName);
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		throw new NodeOperationError(node, error);
	}
}
