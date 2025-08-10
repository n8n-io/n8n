import {
	type IConnection,
	type IConnections,
	type IDataObject,
	type NodeInputConnections,
	type NodeParameterValueType,
	type INodeTypeDescription,
	type INode,
	type INodeParameters,
	type NodeParameterValue,
	type INodeProperties,
	type INodePropertyOptions,
	type INodePropertyCollection,
	type NodePropertyTypes,
	isINodePropertyCollectionList,
	isINodePropertiesList,
	isINodePropertyOptionsList,
	displayParameter,
	isResourceLocatorValue,
	deepCopy,
} from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { CUSTOM_API_CALL_KEY, SWITCH_NODE_TYPE } from '@/constants';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';

import { captureException } from '@sentry/vue';
import { isPresent } from './typesUtils';
import type { Ref } from 'vue';
import { omitKey } from './objectUtils';
import type { BaseTextKey } from '@n8n/i18n';

export function getNodeSettingsInitialValues(): INodeParameters {
	return {
		color: '#ff0000',
		alwaysOutputData: false,
		executeOnce: false,
		notesInFlow: false,
		onError: 'stopWorkflow',
		retryOnFail: false,
		maxTries: 3,
		waitBetweenTries: 1000,
		notes: '',
		parameters: {},
	};
}

export function setValue(
	nodeValues: Ref<INodeParameters>,
	name: string,
	value: NodeParameterValue,
) {
	const nameParts = name.split('.');
	let lastNamePart: string | undefined = nameParts.pop();

	let isArray = false;
	if (lastNamePart?.includes('[')) {
		// It includes an index so we have to extract it
		const lastNameParts = lastNamePart.match(/(.*)\[(\d+)\]$/);
		if (lastNameParts) {
			nameParts.push(lastNameParts[1]);
			lastNamePart = lastNameParts[2];
			isArray = true;
		}
	}

	// Set the value so that everything updates correctly in the UI
	if (nameParts.length === 0) {
		// Data is on top level
		if (value === null) {
			// Property should be deleted
			if (lastNamePart) {
				nodeValues.value = omitKey(nodeValues.value, lastNamePart);
			}
		} else {
			// Value should be set
			nodeValues.value = {
				...nodeValues.value,
				[lastNamePart as string]: value,
			};
		}
	} else {
		// Data is on lower level
		if (value === null) {
			// Property should be deleted
			let tempValue = get(nodeValues.value, nameParts.join('.')) as
				| INodeParameters
				| INodeParameters[];

			if (lastNamePart && !Array.isArray(tempValue)) {
				tempValue = omitKey(tempValue, lastNamePart);
			}

			if (isArray && Array.isArray(tempValue) && tempValue.length === 0) {
				// If a value from an array got delete and no values are left
				// delete also the parent
				lastNamePart = nameParts.pop();
				tempValue = get(nodeValues.value, nameParts.join('.')) as INodeParameters;
				if (lastNamePart) {
					tempValue = omitKey(tempValue, lastNamePart);
				}
			}
		} else {
			// Value should be set
			if (typeof value === 'object') {
				set(
					get(nodeValues.value, nameParts.join('.')) as Record<string, unknown>,
					lastNamePart as string,
					deepCopy(value),
				);
			} else {
				set(
					get(nodeValues.value, nameParts.join('.')) as Record<string, unknown>,
					lastNamePart as string,
					value,
				);
			}
		}
	}

	nodeValues.value = { ...nodeValues.value };
}

export function updateDynamicConnections(
	node: INodeUi,
	workflowConnections: IConnections,
	parameterData: IUpdateInformation<NodeParameterValueType>,
) {
	const connections = { ...workflowConnections };

	try {
		if (parameterData.name.includes('conditions') || !connections[node.name]?.main) return null;

		if (node.type === SWITCH_NODE_TYPE && parameterData.name === 'parameters.numberOutputs') {
			const curentNumberOutputs = node.parameters?.numberOutputs as number;
			const newNumberOutputs = parameterData.value as number;

			// remove extra outputs
			if (newNumberOutputs < curentNumberOutputs) {
				connections[node.name].main = connections[node.name].main.slice(0, newNumberOutputs);
				return connections;
			}
		}

		if (
			node.type === SWITCH_NODE_TYPE &&
			parameterData.name === 'parameters.options.fallbackOutput'
		) {
			const curentFallbackOutput = (node.parameters?.options as { fallbackOutput: string })
				?.fallbackOutput;
			if (curentFallbackOutput === 'extra') {
				if (!parameterData.value || parameterData.value !== 'extra') {
					connections[node.name].main = connections[node.name].main.slice(0, -1);
					return connections;
				}
			}
		}

		if (node.type === SWITCH_NODE_TYPE && parameterData.name.includes('parameters.rules.values')) {
			const { fallbackOutput } = node.parameters?.options as { fallbackOutput: string };

			if (parameterData.value === undefined) {
				function extractIndex(path: string): number | null {
					const match = path.match(/parameters\.rules\.values\[(\d+)\]$/);
					return match ? parseInt(match[1], 10) : null;
				}

				const index = extractIndex(parameterData.name);

				// rule was removed
				if (index !== null) {
					connections[node.name].main.splice(index, 1);
					return connections;
				}

				// all rules were removed
				if (parameterData.name === 'parameters.rules.values') {
					if (fallbackOutput === 'extra') {
						connections[node.name].main = [
							connections[node.name].main[connections[node.name].main.length - 1],
						];
					} else {
						connections[node.name].main = [];
					}

					return connections;
				}
			} else if (parameterData.name === 'parameters.rules.values') {
				const curentRulesvalues = (node.parameters?.rules as { values: IDataObject[] })?.values;
				let lastConnection: IConnection[] | null | undefined = undefined;
				if (
					fallbackOutput === 'extra' &&
					connections[node.name].main.length === curentRulesvalues.length + 1
				) {
					lastConnection = connections[node.name].main.pop();
				}
				// rule was added
				const currentRulesLength = (node.parameters?.rules as { values: IDataObject[] })?.values
					?.length;

				const newRulesLength = (parameterData.value as IDataObject[])?.length;

				if (newRulesLength - currentRulesLength === 1) {
					connections[node.name].main = [...connections[node.name].main, []];

					if (lastConnection) {
						connections[node.name].main.push(lastConnection);
					}

					return connections;
				} else {
					// order was changed
					const newRulesvalues = parameterData.value as IDataObject[];
					const updatedConnectionsIndex: number[] = [];

					for (const newRule of newRulesvalues) {
						const index = curentRulesvalues.findIndex((rule) => isEqual(rule, newRule));
						if (index !== -1) {
							updatedConnectionsIndex.push(index);
						}
					}

					const reorderedConnections: NodeInputConnections = [];

					for (const index of updatedConnectionsIndex) {
						reorderedConnections.push(connections[node.name].main[index] ?? []);
					}

					if (lastConnection) {
						reorderedConnections.push(lastConnection);
					}

					connections[node.name].main = reorderedConnections;
					return connections;
				}
			}
		}
	} catch (error) {
		captureException(error);
	}

	return null;
}

/**
 * Removes node values that are not valid options for the given parameter.
 * This can happen when there are multiple node parameters with the same name
 * but different options and display conditions
 * @param nodeType The node type description
 * @param nodeParameterValues Current node parameter values
 * @param updatedParameter The parameter that was updated. Will be used to determine which parameters to remove based on their display conditions and option values
 */
export function removeMismatchedOptionValues(
	nodeType: INodeTypeDescription,
	nodeTypeVersion: INode['typeVersion'],
	nodeParameterValues: INodeParameters | null,
	updatedParameter: { name: string; value: NodeParameterValue },
) {
	nodeType.properties.forEach((prop) => {
		const displayOptions = prop.displayOptions;
		// Not processing parameters that are not set or don't have options
		if (
			!nodeParameterValues ||
			!Object.prototype.hasOwnProperty.call(nodeParameterValues, prop.name) ||
			!displayOptions ||
			!prop.options
		) {
			return;
		}
		// Only process the parameters that depend on the updated parameter
		const showCondition = displayOptions.show?.[updatedParameter.name];
		const hideCondition = displayOptions.hide?.[updatedParameter.name];
		if (showCondition === undefined && hideCondition === undefined) {
			return;
		}

		let hasValidOptions = true;

		// Every value should be a possible option
		if (isINodePropertyCollectionList(prop.options) || isINodePropertiesList(prop.options)) {
			hasValidOptions = Object.keys(nodeParameterValues).every(
				(key) => (prop.options ?? []).find((option) => option.name === key) !== undefined,
			);
		} else if (isINodePropertyOptionsList(prop.options)) {
			hasValidOptions = !!prop.options.find(
				(option) => option.value === nodeParameterValues[prop.name],
			);
		}

		if (
			!hasValidOptions &&
			displayParameter(nodeParameterValues, prop, { typeVersion: nodeTypeVersion }, nodeType)
		) {
			unset(nodeParameterValues as object, prop.name);
		}
	});
}

export function updateParameterByPath(
	parameterName: string,
	newValue: NodeParameterValue,
	nodeParameters: INodeParameters | null,
	nodeType: INodeTypeDescription,
	nodeTypeVersion: INode['typeVersion'],
) {
	// Remove the 'parameters.' from the beginning to just have the
	// actual parameter name
	const parameterPath = parameterName.split('.').slice(1).join('.');

	// Check if the path is supposed to change an array and if so get
	// the needed data like path and index
	const parameterPathArray = parameterPath.match(/(.*)\[(\d+)\]$/);

	// Apply the new value
	if (newValue === undefined && parameterPathArray !== null) {
		// Delete array item
		const path = parameterPathArray[1];
		const index = parameterPathArray[2];
		const data = get(nodeParameters, path);

		if (Array.isArray(data)) {
			data.splice(parseInt(index, 10), 1);
			set(nodeParameters as object, path, data);
		}
	} else {
		if (newValue === undefined) {
			unset(nodeParameters as object, parameterPath);
		} else {
			set(nodeParameters as object, parameterPath, newValue);
		}

		// If value is updated, remove parameter values that have invalid options
		// so getNodeParameters checks don't fail
		removeMismatchedOptionValues(nodeType, nodeTypeVersion, nodeParameters, {
			name: parameterPath,
			value: newValue,
		});
	}

	return parameterPath;
}

export function getParameterTypeOption<T = string | number | boolean | undefined>(
	parameter: INodeProperties,
	optionName: string,
): T {
	return parameter.typeOptions?.[optionName] as T;
}

export function isResourceLocatorParameterType(type: NodePropertyTypes) {
	return type === 'resourceLocator' || type === 'workflowSelector';
}

export function isValidParameterOption(
	option: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): option is INodePropertyOptions {
	return 'value' in option && isPresent(option.value) && isPresent(option.name);
}

export function mustHideDuringCustomApiCall(
	parameter: INodeProperties,
	nodeParameters: INodeParameters,
): boolean {
	if (parameter?.displayOptions?.hide) return true;

	const MUST_REMAIN_VISIBLE = [
		'authentication',
		'resource',
		'operation',
		...Object.keys(nodeParameters),
	];

	return !MUST_REMAIN_VISIBLE.includes(parameter.name);
}

export function nameIsParameter(
	parameterData: IUpdateInformation,
): parameterData is IUpdateInformation & { name: `parameters.${string}` } {
	return parameterData.name.startsWith('parameters.');
}

export function formatAsExpression(
	value: NodeParameterValueType,
	parameterType: NodePropertyTypes,
) {
	if (isResourceLocatorParameterType(parameterType)) {
		if (isResourceLocatorValue(value)) {
			return {
				__rl: true,
				value: `=${value.value}`,
				mode: value.mode,
			};
		}

		return { __rl: true, value: `=${value as string}`, mode: '' };
	}

	const isNumber = parameterType === 'number';
	const isBoolean = parameterType === 'boolean';
	const isMultiOptions = parameterType === 'multiOptions';

	if (isNumber && (!value || value === '[Object: null]')) {
		return '={{ 0 }}';
	}

	if (isMultiOptions) {
		return `={{ ${JSON.stringify(value)} }}`;
	}

	if (isNumber || isBoolean || typeof value !== 'string') {
		// eslint-disable-next-line @typescript-eslint/no-base-to-string -- stringified intentionally
		return `={{ ${String(value)} }}`;
	}

	return `=${value}`;
}

export function parseFromExpression(
	currentParameterValue: NodeParameterValueType,
	evaluatedExpressionValue: unknown,
	parameterType: NodePropertyTypes,
	defaultValue: NodeParameterValueType,
	parameterOptions: INodePropertyOptions[] = [],
) {
	if (parameterType === 'multiOptions' && typeof evaluatedExpressionValue === 'string') {
		return evaluatedExpressionValue
			.split(',')
			.filter((valueItem) => parameterOptions.find((option) => option.value === valueItem));
	}

	if (
		isResourceLocatorParameterType(parameterType) &&
		isResourceLocatorValue(currentParameterValue)
	) {
		return { __rl: true, value: evaluatedExpressionValue, mode: currentParameterValue.mode };
	}

	if (parameterType === 'string') {
		return currentParameterValue
			? (currentParameterValue as string).toString().replace(/^=+/, '')
			: null;
	}

	if (typeof evaluatedExpressionValue !== 'undefined') {
		return evaluatedExpressionValue;
	}

	if (['number', 'boolean'].includes(parameterType)) {
		return defaultValue;
	}

	return null;
}

export function shouldSkipParamValidation(
	parameter: INodeProperties,
	value: NodeParameterValueType,
) {
	return (
		(typeof value === 'string' && value.includes(CUSTOM_API_CALL_KEY)) ||
		(['options', 'multiOptions'].includes(parameter.type) &&
			Boolean(parameter.allowArbitraryValues))
	);
}

export function createCommonNodeSettings(
	isExecutable: boolean,
	isTriggerNode: boolean,
	t: (key: BaseTextKey) => string,
) {
	const ret: INodeProperties[] = [];

	if (isExecutable && !isTriggerNode) {
		ret.push(
			{
				displayName: t('nodeSettings.alwaysOutputData.displayName'),
				name: 'alwaysOutputData',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: t('nodeSettings.alwaysOutputData.description'),
				isNodeSetting: true,
			},
			{
				displayName: t('nodeSettings.executeOnce.displayName'),
				name: 'executeOnce',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: t('nodeSettings.executeOnce.description'),
				isNodeSetting: true,
			},
			{
				displayName: t('nodeSettings.retryOnFail.displayName'),
				name: 'retryOnFail',
				type: 'boolean',
				default: false,
				noDataExpression: true,
				description: t('nodeSettings.retryOnFail.description'),
				isNodeSetting: true,
			},
			{
				displayName: t('nodeSettings.maxTries.displayName'),
				name: 'maxTries',
				type: 'number',
				typeOptions: {
					minValue: 2,
					maxValue: 5,
				},
				default: 3,
				displayOptions: {
					show: {
						retryOnFail: [true],
					},
				},
				noDataExpression: true,
				description: t('nodeSettings.maxTries.description'),
				isNodeSetting: true,
			},
			{
				displayName: t('nodeSettings.waitBetweenTries.displayName'),
				name: 'waitBetweenTries',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 5000,
				},
				default: 1000,
				displayOptions: {
					show: {
						retryOnFail: [true],
					},
				},
				noDataExpression: true,
				description: t('nodeSettings.waitBetweenTries.description'),
				isNodeSetting: true,
			},
			{
				displayName: t('nodeSettings.onError.displayName'),
				name: 'onError',
				type: 'options',
				options: [
					{
						name: t('nodeSettings.onError.options.stopWorkflow.displayName'),
						value: 'stopWorkflow',
						description: t('nodeSettings.onError.options.stopWorkflow.description'),
					},
					{
						name: t('nodeSettings.onError.options.continueRegularOutput.displayName'),
						value: 'continueRegularOutput',
						description: t('nodeSettings.onError.options.continueRegularOutput.description'),
					},
					{
						name: t('nodeSettings.onError.options.continueErrorOutput.displayName'),
						value: 'continueErrorOutput',
						description: t('nodeSettings.onError.options.continueErrorOutput.description'),
					},
				],
				default: 'stopWorkflow',
				description: t('nodeSettings.onError.description'),
				noDataExpression: true,
				isNodeSetting: true,
			},
		);
	}

	ret.push(
		{
			displayName: t('nodeSettings.notes.displayName'),
			name: 'notes',
			type: 'string',
			typeOptions: {
				rows: 5,
			},
			default: '',
			noDataExpression: true,
			description: t('nodeSettings.notes.description'),
			isNodeSetting: true,
		},
		{
			displayName: t('nodeSettings.notesInFlow.displayName'),
			name: 'notesInFlow',
			type: 'boolean',
			default: false,
			noDataExpression: true,
			description: t('nodeSettings.notesInFlow.description'),
			isNodeSetting: true,
		},
	);

	return ret;
}

export function collectSettings(node: INodeUi, nodeSettings: INodeProperties[]): INodeParameters {
	let ret = getNodeSettingsInitialValues();

	const foundNodeSettings = [];

	if (node.color) {
		foundNodeSettings.push('color');
		ret = {
			...ret,
			color: node.color,
		};
	}

	if (node.notes) {
		foundNodeSettings.push('notes');
		ret = {
			...ret,
			notes: node.notes,
		};
	}

	if (node.alwaysOutputData) {
		foundNodeSettings.push('alwaysOutputData');
		ret = {
			...ret,
			alwaysOutputData: node.alwaysOutputData,
		};
	}

	if (node.executeOnce) {
		foundNodeSettings.push('executeOnce');
		ret = {
			...ret,
			executeOnce: node.executeOnce,
		};
	}

	if (node.continueOnFail) {
		foundNodeSettings.push('onError');
		ret = {
			...ret,
			onError: 'continueRegularOutput',
		};
	}

	if (node.onError) {
		foundNodeSettings.push('onError');
		ret = {
			...ret,
			onError: node.onError,
		};
	}

	if (node.notesInFlow) {
		foundNodeSettings.push('notesInFlow');
		ret = {
			...ret,
			notesInFlow: node.notesInFlow,
		};
	}

	if (node.retryOnFail) {
		foundNodeSettings.push('retryOnFail');
		ret = {
			...ret,
			retryOnFail: node.retryOnFail,
		};
	}

	if (node.maxTries) {
		foundNodeSettings.push('maxTries');
		ret = {
			...ret,
			maxTries: node.maxTries,
		};
	}

	if (node.waitBetweenTries) {
		foundNodeSettings.push('waitBetweenTries');
		ret = {
			...ret,
			waitBetweenTries: node.waitBetweenTries,
		};
	}

	// Set default node settings
	for (const nodeSetting of nodeSettings) {
		if (!foundNodeSettings.includes(nodeSetting.name)) {
			// Set default value
			ret = {
				...ret,
				[nodeSetting.name]: nodeSetting.default,
			};
		}
	}

	ret = {
		...ret,
		parameters: deepCopy(node.parameters),
	};

	return ret;
}

export function collectParametersByTab(parameters: INodeProperties[], isEmbeddedInCanvas: boolean) {
	const ret: Record<'settings' | 'action' | 'params', INodeProperties[]> = {
		settings: [],
		action: [],
		params: [],
	};

	for (const item of parameters) {
		if (item.isNodeSetting) {
			ret.settings.push(item);
			continue;
		}

		if (!isEmbeddedInCanvas) {
			ret.params.push(item);
			continue;
		}

		if (item.name === 'resource' || item.name === 'operation') {
			ret.action.push(item);
			continue;
		}

		ret.params.push(item);
	}

	return ret;
}
