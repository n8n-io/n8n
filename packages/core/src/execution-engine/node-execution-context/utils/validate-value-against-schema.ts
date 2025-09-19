import type {
	FieldType,
	IDataObject,
	INode,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
	ResourceMapperTypeOptions,
} from 'n8n-workflow';
import {
	ExpressionError,
	isResourceMapperValue,
	NodeHelpers,
	validateFieldType,
} from 'n8n-workflow';

import type { ExtendedValidationResult } from '@/interfaces';

const validateResourceMapperValue = (
	parameterName: string,
	paramValues: { [key: string]: unknown },
	node: INode,
	resourceMapperTypeOptions?: ResourceMapperTypeOptions,
): ExtendedValidationResult => {
	const result: ExtendedValidationResult = { valid: true, newValue: paramValues };
	const skipRequiredCheck = resourceMapperTypeOptions?.mode !== 'add';
	const enableTypeValidationOptions = Boolean(resourceMapperTypeOptions?.showTypeConversionOptions);
	const paramNameParts = parameterName.split('.');
	if (paramNameParts.length !== 2) {
		return result;
	}
	const resourceMapperParamName = paramNameParts[0];
	const resourceMapperField = node.parameters[resourceMapperParamName];
	if (!resourceMapperField || !isResourceMapperValue(resourceMapperField)) {
		return result;
	}
	const schema = resourceMapperField.schema;
	const paramValueNames = Object.keys(paramValues);
	for (let i = 0; i < paramValueNames.length; i++) {
		const key = paramValueNames[i];
		const resolvedValue = paramValues[key];

		const schemaEntry = schema.find((s) => s.id === key);

		if (
			!skipRequiredCheck &&
			schemaEntry?.required === true &&
			schemaEntry.type !== 'boolean' &&
			(resolvedValue === undefined || resolvedValue === null)
		) {
			return {
				valid: false,
				errorMessage: `The value "${String(key)}" is required but not set`,
				fieldName: key,
			};
		}

		if (schemaEntry?.type) {
			const validationResult = validateFieldType(key, resolvedValue, schemaEntry.type, {
				valueOptions: schemaEntry.options,
				strict: enableTypeValidationOptions && !resourceMapperField.attemptToConvertTypes,
				parseStrings: enableTypeValidationOptions && resourceMapperField.convertFieldsToString,
			});

			if (!validationResult.valid) {
				return { ...validationResult, fieldName: key };
			} else {
				// If it's valid, set the casted value
				paramValues[key] = validationResult.newValue;
			}
		}
	}
	return result;
};

const validateCollection = (
	node: INode,
	runIndex: number,
	itemIndex: number,
	propertyDescription: INodeProperties,
	parameterPath: string[],
	validationResult: ExtendedValidationResult,
): ExtendedValidationResult => {
	let nestedDescriptions: INodeProperties[] | undefined;

	if (propertyDescription.type === 'fixedCollection') {
		nestedDescriptions = (propertyDescription.options as INodePropertyCollection[]).find(
			(entry) => entry.name === parameterPath[1],
		)?.values;
	}

	if (propertyDescription.type === 'collection') {
		nestedDescriptions = propertyDescription.options as INodeProperties[];
	}

	if (!nestedDescriptions) {
		return validationResult;
	}

	const validationMap: {
		[key: string]: { type: FieldType; displayName: string; options?: INodePropertyOptions[] };
	} = {};

	for (const prop of nestedDescriptions) {
		if (!prop.validateType || prop.ignoreValidationDuringExecution) continue;

		validationMap[prop.name] = {
			type: prop.validateType,
			displayName: prop.displayName,
			options:
				prop.validateType === 'options' ? (prop.options as INodePropertyOptions[]) : undefined,
		};
	}

	if (!Object.keys(validationMap).length) {
		return validationResult;
	}

	if (validationResult.valid) {
		for (const value of Array.isArray(validationResult.newValue)
			? (validationResult.newValue as IDataObject[])
			: [validationResult.newValue as IDataObject]) {
			for (const key of Object.keys(value)) {
				if (!validationMap[key]) continue;

				const fieldValidationResult = validateFieldType(key, value[key], validationMap[key].type, {
					valueOptions: validationMap[key].options,
				});

				if (!fieldValidationResult.valid) {
					throw new ExpressionError(
						`Invalid input for field '${validationMap[key].displayName}' inside '${propertyDescription.displayName}' in [item ${itemIndex}]`,
						{
							description: fieldValidationResult.errorMessage,
							runIndex,
							itemIndex,
							nodeCause: node.name,
						},
					);
				}
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				value[key] = fieldValidationResult.newValue;
			}
		}
	}

	return validationResult;
};

export const validateValueAgainstSchema = (
	node: INode,
	nodeType: INodeType,
	parameterValue: string | number | boolean | object | null | undefined,
	parameterName: string,
	runIndex: number,
	itemIndex: number,
) => {
	const parameterPath = parameterName.split('.');

	const propertyDescription = nodeType.description.properties.find(
		(prop) =>
			parameterPath[0] === prop.name &&
			NodeHelpers.displayParameter(node.parameters, prop, node, nodeType.description),
	);

	if (!propertyDescription) {
		return parameterValue;
	}

	let validationResult: ExtendedValidationResult = { valid: true, newValue: parameterValue };

	if (
		parameterPath.length === 1 &&
		propertyDescription.validateType &&
		!propertyDescription.ignoreValidationDuringExecution
	) {
		validationResult = validateFieldType(
			parameterName,
			parameterValue,
			propertyDescription.validateType,
		);
	} else if (
		propertyDescription.type === 'resourceMapper' &&
		parameterPath[1] === 'value' &&
		typeof parameterValue === 'object'
	) {
		validationResult = validateResourceMapperValue(
			parameterName,
			parameterValue as { [key: string]: unknown },
			node,
			propertyDescription.typeOptions?.resourceMapper,
		);
	} else if (['fixedCollection', 'collection'].includes(propertyDescription.type)) {
		validationResult = validateCollection(
			node,
			runIndex,
			itemIndex,
			propertyDescription,
			parameterPath,
			validationResult,
		);
	}

	if (!validationResult.valid) {
		throw new ExpressionError(
			`Invalid input for '${
				validationResult.fieldName
					? String(validationResult.fieldName)
					: propertyDescription.displayName
			}' [item ${itemIndex}]`,
			{
				description: validationResult.errorMessage,
				runIndex,
				itemIndex,
				nodeCause: node.name,
			},
		);
	}
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return validationResult.newValue;
};
