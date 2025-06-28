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
	isINodePropertyCollectionList,
	isINodePropertiesList,
	isINodePropertyOptionsList,
	displayParameter,
} from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { SWITCH_NODE_TYPE } from '@/constants';
import isEqual from 'lodash/isEqual';
import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';

import { captureException } from '@sentry/vue';

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
		if (!nodeParameterValues?.hasOwnProperty(prop.name) || !displayOptions || !prop.options) {
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
