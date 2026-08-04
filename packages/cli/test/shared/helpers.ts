import {
	NodeConnectionTypes,
	type IDataObject,
	type ITaskData,
	type NodeConnectionType,
} from 'n8n-workflow';

type TaskData = {
	data: IDataObject;
	outputIndex?: number;
	nodeConnectionType?: NodeConnectionType;
};

export function toITaskData(taskData: TaskData[], overrides?: Partial<ITaskData>): ITaskData {
	const result: ITaskData = {
		executionStatus: 'success',
		executionTime: 0,
		startTime: 0,
		executionIndex: 0,
		source: [],
		data: {},
		...(overrides ?? {}),
	};

	// NOTE: Here to make TS happy.
	result.data = result.data ?? {};
	for (const taskDatum of taskData) {
		const type = taskDatum.nodeConnectionType ?? NodeConnectionTypes.Main;
		const outputIndex = taskDatum.outputIndex ?? 0;

		result.data[type] = result.data[type] ?? [];
		const dataConnection = result.data[type];
		dataConnection[outputIndex] = [{ json: taskDatum.data }];
	}

	for (const [type, dataConnection] of Object.entries(result.data)) {
		for (const [index, maybe] of dataConnection.entries()) {
			result.data[type][index] = maybe ?? null;
		}
	}

	return result;
}
