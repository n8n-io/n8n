import type {
	IPinData,
	IRunData,
	IRunExecutionData,
	ITaskDataConnections,
	IWaitingForExecution,
	IWaitingForExecutionSource,
} from 'n8n-workflow';

/** Limit the items of every connection in a task-data connection map. */
function truncateConnections(
	connections: ITaskDataConnections,
	truncateData?: number,
): ITaskDataConnections {
	if (!truncateData) return connections;

	const truncated: ITaskDataConnections = {};
	for (const [connectionType, outputs] of Object.entries(connections)) {
		truncated[connectionType] = outputs.map((items) =>
			items ? items.slice(0, truncateData) : items,
		);
	}
	return truncated;
}

/** Keep only the requested node keys, and limit the items in each of their runs. */
function filterWaitingExecution(
	waitingExecution: IWaitingForExecution,
	allowedNodeNames: Set<string> | undefined,
	truncateData?: number,
): IWaitingForExecution {
	const filtered: IWaitingForExecution = {};
	for (const [nodeName, runs] of Object.entries(waitingExecution)) {
		if (allowedNodeNames && !allowedNodeNames.has(nodeName)) continue;

		const filteredRuns: IWaitingForExecution[string] = {};
		for (const [runIndex, connections] of Object.entries(runs)) {
			filteredRuns[Number(runIndex)] = truncateConnections(connections, truncateData);
		}
		filtered[nodeName] = filteredRuns;
	}
	return filtered;
}

/** Source data holds no items, so only the node keys need filtering. */
function filterWaitingExecutionSource(
	source: IWaitingForExecutionSource | null,
	allowedNodeNames: Set<string> | undefined,
): IWaitingForExecutionSource | null {
	if (source === null || allowedNodeNames === undefined) return source;

	const filtered: IWaitingForExecutionSource = {};
	for (const [nodeName, runs] of Object.entries(source)) {
		if (allowedNodeNames.has(nodeName)) filtered[nodeName] = runs;
	}
	return filtered;
}

/**
 * Apply the tool's `nodeNames` and `truncateData` options to every node-level
 * part of an execution, not just `resultData`. Failed executions keep the
 * failing node (with its full input items) in `executionData.nodeExecutionStack`,
 * so leaving it untouched lets filtered calls return data the caller asked to
 * keep out of the response.
 */
export function filterExecutionData(
	data: IRunExecutionData,
	nodeNames?: string[],
	truncateData?: number,
): IRunExecutionData {
	// Shallow clone is sufficient — the result is serialized immediately and never mutated
	const filtered = { ...data, resultData: { ...data.resultData } };
	const allowedNodeNames = nodeNames === undefined ? undefined : new Set(nodeNames);

	let runData = filtered.resultData.runData ?? {};

	if (allowedNodeNames) {
		const filteredRunData: IRunData = {};
		for (const name of allowedNodeNames) {
			if (name in runData) {
				filteredRunData[name] = runData[name];
			}
		}
		runData = filteredRunData;

		if (filtered.resultData.pinData) {
			const filteredPinData: IPinData = {};
			for (const name of allowedNodeNames) {
				if (name in filtered.resultData.pinData) {
					filteredPinData[name] = filtered.resultData.pinData[name];
				}
			}
			filtered.resultData.pinData = filteredPinData;
		}
	}

	if (truncateData) {
		const truncated: IRunData = {};
		for (const [nodeName, taskDataArray] of Object.entries(runData)) {
			truncated[nodeName] = taskDataArray.map((taskData) => {
				if (!taskData.data) return taskData;
				return { ...taskData, data: truncateConnections(taskData.data, truncateData) };
			});
		}
		runData = truncated;
	}

	filtered.resultData.runData = runData;

	const executionData = data.executionData;
	if (executionData && (allowedNodeNames || truncateData)) {
		filtered.executionData = {
			...executionData,
			nodeExecutionStack: executionData.nodeExecutionStack
				.filter((entry) => !allowedNodeNames || allowedNodeNames.has(entry.node.name))
				.map((entry) => ({
					...entry,
					data: truncateConnections(entry.data, truncateData),
				})),
			waitingExecution: filterWaitingExecution(
				executionData.waitingExecution,
				allowedNodeNames,
				truncateData,
			),
			waitingExecutionSource: filterWaitingExecutionSource(
				executionData.waitingExecutionSource,
				allowedNodeNames,
			),
		};
	}

	return filtered;
}
