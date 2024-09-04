import { type INode, type IPinData, type IRunData } from 'n8n-workflow';

import type { Connection, DirectedGraph } from './DirectedGraph';

function sortByInputIndexThenByName(connection1: Connection, connection2: Connection): number {
	if (connection1.inputIndex === connection2.inputIndex) {
		return connection1.from.name.localeCompare(connection2.from.name);
	} else {
		return connection1.inputIndex - connection2.inputIndex;
	}
}

/**
 * Groups incoming connections to the node. The groups contain one connection
 * per input, if possible, with run data or pinned data.
 *
 * The purpose of this is to get as many complete sets of data for executing
 * nodes with multiple inputs.
 *
 * # Example 1:
 * ┌───────┐1
 * │source1├────┐
 * └───────┘    │   ┌────┐
 * ┌───────┐1   ├──►│    │
 * │source2├────┘   │node│
 * └───────┘    ┌──►│    │
 * ┌───────┐1   │   └────┘
 * │source3├────┘
 * └───────┘
 *
 * Given this workflow, and assuming all sources have run data or pinned data,
 * it's possible to run `node` with the data of `source1` and `source3` and
 * then one more time with the data from `source2`.
 *
 * It would also be possible to run `node` with the data of `source2` and
 * `source3` and then one more time with the data from `source1`.
 *
 * To improve the determinism of this the connections are sorted by input and
 * then by from-node name.
 *
 * So this will return 2 groups:
 * 1. source1 and source3
 * 2. source2
 *
 * # Example 2:
 * ┌───────┐0
 * │source1├────┐
 * └───────┘    │   ┌────┐
 * ┌───────┐1   ├──►│    │
 * │source2├────┘   │node│
 * └───────┘    ┌──►│    │
 * ┌───────┐1   │   └────┘
 * │source3├────┘
 * └───────┘
 *
 * Since `source1` has no run data and no pinned data it's skipped in favor of
 * `source2` for the for input.
 *
 * So this will return 1 group:
 * 1. source2 and source3
 */
export function getSourceDataGroups(
	graph: DirectedGraph,
	node: INode,
	runData: IRunData,
	pinnedData: IPinData,
): Connection[][] {
	const connections = graph.getConnections({ to: node });

	const sortedConnectionsWithData = [];

	for (const connection of connections) {
		const hasData = runData[connection.from.name] || pinnedData[connection.from.name];

		if (hasData) {
			sortedConnectionsWithData.push(connection);
		}
	}

	sortedConnectionsWithData.sort(sortByInputIndexThenByName);

	const groups: Connection[][] = [];
	let currentGroup: Connection[] = [];
	let currentInputIndex = -1;

	while (sortedConnectionsWithData.length > 0) {
		const connectionWithDataIndex = sortedConnectionsWithData.findIndex(
			// eslint-disable-next-line @typescript-eslint/no-loop-func
			(c) => c.inputIndex > currentInputIndex,
		);
		const connection: Connection | undefined = sortedConnectionsWithData[connectionWithDataIndex];

		if (connection === undefined) {
			groups.push(currentGroup);
			currentGroup = [];
			currentInputIndex = -1;
			continue;
		}

		currentInputIndex = connection.inputIndex;
		currentGroup.push(connection);

		if (connectionWithDataIndex >= 0) {
			sortedConnectionsWithData.splice(connectionWithDataIndex, 1);
		}
	}

	groups.push(currentGroup);

	return groups;
}
