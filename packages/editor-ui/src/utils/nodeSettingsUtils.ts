import type {
	IConnection,
	IConnections,
	IDataObject,
	NodeInputConnections,
	NodeParameterValueType,
} from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { SWITCH_NODE_TYPE } from '@/constants';
import { isEqual } from 'lodash-es';

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
				?.fallbackOutput as string;
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
				let lastConnection: IConnection[] | undefined = undefined;
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

					for (const rule of curentRulesvalues) {
						const index = newRulesvalues.findIndex((newRule) => isEqual(rule, newRule));
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
