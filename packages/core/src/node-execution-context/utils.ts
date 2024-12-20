import { DateTime } from 'luxon';
import type {
	EnsureTypeOptions,
	FieldType,
	IDataObject,
	INode,
	INodeParameters,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
	INodeType,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	IWorkflowExecuteAdditionalData,
	NodeParameterValueType,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import {
	ExpressionError,
	isResourceMapperValue,
	LoggerProxy,
	NodeHelpers,
	validateFieldType,
} from 'n8n-workflow';

import { PLACEHOLDER_EMPTY_EXECUTION_ID } from '@/Constants';
import {
	setWorkflowExecutionMetadata,
	setAllWorkflowExecutionMetadata,
	getWorkflowExecutionMetadata,
	getAllWorkflowExecutionMetadata,
} from '@/ExecutionMetadata';
import type { ExtendedValidationResult } from '@/Interfaces';
import { getSecretsProxy } from '@/Secrets';

/**
 * Clean up parameter data to make sure that only valid data gets returned
 * INFO: Currently only converts Luxon Dates as we know for sure it will not be breaking
 */
export function cleanupParameterData(inputData: NodeParameterValueType): void {
	if (typeof inputData !== 'object' || inputData === null) {
		return;
	}

	if (Array.isArray(inputData)) {
		inputData.forEach((value) => cleanupParameterData(value as NodeParameterValueType));
		return;
	}

	if (typeof inputData === 'object') {
		Object.keys(inputData).forEach((key) => {
			const value = (inputData as INodeParameters)[key];
			if (typeof value === 'object') {
				if (DateTime.isDateTime(value)) {
					// Is a special luxon date so convert to string
					(inputData as INodeParameters)[key] = value.toString();
				} else {
					cleanupParameterData(value);
				}
			}
		});
	}
}

const validateResourceMapperValue = (
	parameterName: string,
	paramValues: { [key: string]: unknown },
	node: INode,
	skipRequiredCheck = false,
): ExtendedValidationResult => {
	const result: ExtendedValidationResult = { valid: true, newValue: paramValues };
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
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
		const schemaEntry = schema.find((s) => s.id === key);

		if (
			!skipRequiredCheck &&
			schemaEntry?.required === true &&
			schemaEntry.type !== 'boolean' &&
			!resolvedValue
		) {
			return {
				valid: false,
				errorMessage: `The value "${String(key)}" is required but not set`,
				fieldName: key,
			};
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (schemaEntry?.type) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			const validationResult = validateFieldType(key, resolvedValue, schemaEntry.type, {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
				valueOptions: schemaEntry.options,
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
			parameterPath[0] === prop.name && NodeHelpers.displayParameter(node.parameters, prop, node),
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
			propertyDescription.typeOptions?.resourceMapper?.mode !== 'add',
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

export function ensureType(
	toType: EnsureTypeOptions,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parameterValue: any,
	parameterName: string,
	errorOptions?: { itemIndex?: number; runIndex?: number; nodeCause?: string },
): string | number | boolean | object {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	let returnData = parameterValue;

	if (returnData === null) {
		throw new ExpressionError(`Parameter '${parameterName}' must not be null`, errorOptions);
	}

	if (returnData === undefined) {
		throw new ExpressionError(
			`Parameter '${parameterName}' could not be 'undefined'`,
			errorOptions,
		);
	}

	if (['object', 'array', 'json'].includes(toType)) {
		if (typeof returnData !== 'object') {
			// if value is not an object and is string try to parse it, else throw an error
			if (typeof returnData === 'string' && returnData.length) {
				try {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					const parsedValue = JSON.parse(returnData);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					returnData = parsedValue;
				} catch (error) {
					throw new ExpressionError(`Parameter '${parameterName}' could not be parsed`, {
						...errorOptions,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
						description: error.message,
					});
				}
			} else {
				throw new ExpressionError(
					`Parameter '${parameterName}' must be an ${toType}, but we got '${String(parameterValue)}'`,
					errorOptions,
				);
			}
		} else if (toType === 'json') {
			// value is an object, make sure it is valid JSON
			try {
				JSON.stringify(returnData);
			} catch (error) {
				throw new ExpressionError(`Parameter '${parameterName}' is not valid JSON`, {
					...errorOptions,
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
					description: error.message,
				});
			}
		}

		if (toType === 'array' && !Array.isArray(returnData)) {
			// value is not an array, but has to be
			throw new ExpressionError(
				`Parameter '${parameterName}' must be an array, but we got object`,
				errorOptions,
			);
		}
	}

	try {
		if (toType === 'string') {
			if (typeof returnData === 'object') {
				returnData = JSON.stringify(returnData);
			} else {
				returnData = String(returnData);
			}
		}

		if (toType === 'number') {
			returnData = Number(returnData);
			if (Number.isNaN(returnData)) {
				throw new ExpressionError(
					`Parameter '${parameterName}' must be a number, but we got '${parameterValue}'`,
					errorOptions,
				);
			}
		}

		if (toType === 'boolean') {
			returnData = Boolean(returnData);
		}
	} catch (error) {
		if (error instanceof ExpressionError) throw error;

		throw new ExpressionError(`Parameter '${parameterName}' could not be converted to ${toType}`, {
			...errorOptions,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			description: error.message,
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return returnData;
}

/** Returns the additional keys for Expressions and Function-Nodes */
export function getAdditionalKeys(
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	runExecutionData: IRunExecutionData | null,
	options?: { secretsEnabled?: boolean },
): IWorkflowDataProxyAdditionalKeys {
	const executionId = additionalData.executionId ?? PLACEHOLDER_EMPTY_EXECUTION_ID;
	const resumeUrl = `${additionalData.webhookWaitingBaseUrl}/${executionId}`;
	const resumeFormUrl = `${additionalData.formWaitingBaseUrl}/${executionId}`;
	return {
		$execution: {
			id: executionId,
			mode: mode === 'manual' ? 'test' : 'production',
			resumeUrl,
			resumeFormUrl,
			customData: runExecutionData
				? {
						set(key: string, value: string): void {
							try {
								setWorkflowExecutionMetadata(runExecutionData, key, value);
							} catch (e) {
								if (mode === 'manual') {
									throw e;
								}
								// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
								LoggerProxy.debug(e.message);
							}
						},
						setAll(obj: Record<string, string>): void {
							try {
								setAllWorkflowExecutionMetadata(runExecutionData, obj);
							} catch (e) {
								if (mode === 'manual') {
									throw e;
								}
								// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
								LoggerProxy.debug(e.message);
							}
						},
						get(key: string): string {
							return getWorkflowExecutionMetadata(runExecutionData, key);
						},
						getAll(): Record<string, string> {
							return getAllWorkflowExecutionMetadata(runExecutionData);
						},
					}
				: undefined,
		},
		$vars: additionalData.variables,
		$secrets: options?.secretsEnabled ? getSecretsProxy(additionalData) : undefined,

		// deprecated
		$executionId: executionId,
		$resumeWebhookUrl: resumeUrl,
	};
}
