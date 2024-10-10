import type { IConnections, IDataObject, NodeParameterValueType } from 'n8n-workflow';
import type { INodeUi, IUpdateInformation } from '@/Interface';
import { SWITCH_NODE_TYPE } from '@/constants';

export function updateDynamicConnections(
	node: INodeUi,
	connections: IConnections,
	parameterData: IUpdateInformation<NodeParameterValueType>,
) {
	console.log(parameterData.name, parameterData.value);
	if (node.type === SWITCH_NODE_TYPE && parameterData.name === 'parameters.numberOutputs') {
		const curentNumberOutputs = node.parameters?.numberOutputs as number;
		const newNumberOutputs = parameterData.value as number;

		// remove extra outputs
		if (newNumberOutputs < curentNumberOutputs) {
			connections[node.name].main = connections[node.name].main.slice(0, newNumberOutputs);
			return connections;
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
			// rule was added
			const currentRulesLength = (node.parameters?.rules as { values: IDataObject[] })?.values
				?.length;

			const newRulesLength = (parameterData.value as IDataObject[])?.length;

			if (newRulesLength - currentRulesLength === 1) {
				if (fallbackOutput === 'extra') {
					const lastConnection = connections[node.name].main.pop();
					connections[node.name].main = [...connections[node.name].main, []];

					if (lastConnection) {
						connections[node.name].main.push(lastConnection);
					}
				} else {
					connections[node.name].main = [...connections[node.name].main, []];
				}

				return connections;
			}
		}
	}

	return null;
}
