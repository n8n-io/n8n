import { NodeConnectionType } from 'n8n-workflow';
import type { INodeParameters, INode, ITaskData, IDataObject, IConnections } from 'n8n-workflow';

interface StubNode {
	name: string;
	parameters?: INodeParameters;
	disabled?: boolean;
}

export function createNodeData(stubData: StubNode): INode {
	return {
		name: stubData.name,
		parameters: stubData.parameters ?? {},
		type: 'test.set',
		typeVersion: 1,
		id: 'uuid-1234',
		position: [100, 100],
		disabled: stubData.disabled ?? false,
	};
}

type TaskData = {
	data: IDataObject;
	outputIndex?: number;
	nodeConnectionType?: NodeConnectionType;
};

export function toITaskData(taskData: TaskData[]): ITaskData {
	const result: ITaskData = {
		executionStatus: 'success',
		executionTime: 0,
		startTime: 0,
		source: [],
		data: {},
	};

	// NOTE: Here to make TS happy.
	result.data = result.data ?? {};
	for (const taskDatum of taskData) {
		const type = taskDatum.nodeConnectionType ?? NodeConnectionType.Main;
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

export const nodeTypes = {
	getByName: jest.fn(),
	getByNameAndVersion: jest.fn(),
	getKnownTypes: jest.fn(),
};

export const defaultWorkflowParameter = {
	active: false,
	nodeTypes,
};

type Connection = {
	from: INode;
	to: INode;
	type?: NodeConnectionType;
	outputIndex?: number;
	inputIndex?: number;
};

export function toIConnections(connections: Connection[]): IConnections {
	const result: IConnections = {};

	for (const connection of connections) {
		const type = connection.type ?? NodeConnectionType.Main;
		const outputIndex = connection.outputIndex ?? 0;
		const inputIndex = connection.inputIndex ?? 0;

		result[connection.from.name] = result[connection.from.name] ?? {
			[type]: [],
		};
		const resultConnection = result[connection.from.name];
		resultConnection[type][outputIndex] = resultConnection[type][outputIndex] ?? [];
		const group = resultConnection[type][outputIndex];

		group.push({
			node: connection.to.name,
			type,
			index: inputIndex,
		});
	}

	return result;
}
