import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypes,
} from 'n8n-workflow';
import { NodeConnectionTypes, UnexpectedError } from 'n8n-workflow';

import type { WorkflowJson } from './run-workflow';

/** The sentinel node type mocked nodes are rewritten to at run time. */
export const MOCK_NODE_TYPE = 'n8n-test.mock';

export interface MockedNodeHandle {
	/** The first item's `json` the mocked node received; `undefined` until the workflow ran. */
	input(): IDataObject | undefined;
}

interface MockEntry {
	output: IDataObject;
	capturedInput?: IDataObject;
}

// Keyed by the workflow JSON object identity — several nodes per workflow, several
// workflows per test file. A plain Map so `clearNodeMocks` can empty it between tests.
const registry = new Map<WorkflowJson, Map<string, MockEntry>>();

/**
 * Replaces the named node's execution with a canned output for every subsequent
 * {@link runWorkflow} of this workflow object, until {@link clearNodeMocks} runs.
 * The JSON itself is never mutated. Mocking the same node again replaces the
 * previous mock (last one wins).
 *
 * The returned handle captures what the node received on the latest run.
 */
export function mockNode(
	workflow: WorkflowJson,
	nodeName: string,
	output: IDataObject,
): MockedNodeHandle {
	if (!workflow.nodes.some((node) => node.name === nodeName)) {
		throw new UnexpectedError(
			`Cannot mock node "${nodeName}": the workflow has no node with that name`,
		);
	}
	let mocks = registry.get(workflow);
	if (!mocks) {
		mocks = new Map();
		registry.set(workflow, mocks);
	}
	const entry: MockEntry = { output };
	mocks.set(nodeName, entry);
	return { input: () => entry.capturedInput };
}

/** Forget every registered mock — call between tests so mocks never leak. */
export function clearNodeMocks(): void {
	registry.clear();
}

export function getNodeMocks(workflow: WorkflowJson): Map<string, MockEntry> | undefined {
	const mocks = registry.get(workflow);
	// A fresh run means fresh captures: a handle must never report a previous run's input.
	if (mocks) for (const entry of mocks.values()) entry.capturedInput = undefined;
	return mocks;
}

/**
 * The stand-in node implementation for one run: emits the entry's canned output as a
 * single item and records the input it received.
 */
export function createMockNodeType(mocks: Map<string, MockEntry>): INodeType {
	return {
		description: {
			displayName: 'n8n-test Mocked Node',
			name: MOCK_NODE_TYPE,
			group: ['transform'],
			version: 1,
			description: 'Stands in for a node mocked with mockNode()',
			defaults: { name: 'Mocked Node' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		},
		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			const nodeName = this.getNode().name;
			const entry = mocks.get(nodeName);
			if (!entry) throw new UnexpectedError(`No mock registered for node "${nodeName}"`);
			entry.capturedInput = this.getInputData()[0]?.json;
			return await Promise.resolve([[{ json: entry.output }]]);
		},
	};
}

/** Serves the mock type for the sentinel, everything else from the real registry. */
export function withMockNodeType(nodeTypes: INodeTypes, mockType: INodeType): INodeTypes {
	return {
		getByName: (type) => (type === MOCK_NODE_TYPE ? mockType : nodeTypes.getByName(type)),
		getByNameAndVersion: (type, version) =>
			type === MOCK_NODE_TYPE ? mockType : nodeTypes.getByNameAndVersion(type, version),
		getKnownTypes: () => nodeTypes.getKnownTypes(),
	};
}
