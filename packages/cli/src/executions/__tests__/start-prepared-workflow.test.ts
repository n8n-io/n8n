import { ExecutionLifecycleHooks } from 'n8n-core';
import { createRunExecutionData, NodeConnectionTypes, Workflow } from 'n8n-workflow';
import type { INode, INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { startPreparedWorkflow } from '../start-prepared-workflow';

function execution() {
	const seen: unknown[] = [];
	const node: INode = {
		id: 'start',
		name: 'Start',
		type: 'test.start',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const nodeType: INodeType = {
		description: {
			displayName: 'Start',
			name: 'start',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Start' },
			properties: [],
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
		},
		async execute() {
			seen.push(additionalData.variables.value);
			return [[{ json: { value: additionalData.variables.value } }]];
		},
	};
	const workflow = new Workflow({
		id: 'prepared',
		nodes: [node],
		connections: {},
		active: false,
		nodeTypes: {
			getByName: () => nodeType,
			getByNameAndVersion: () => nodeType,
			getKnownTypes: () => ({}),
		},
	});
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		hooks: new ExecutionLifecycleHooks('trigger', '1', mock()),
		variables: {},
		encryptedRunnerIdentity: undefined,
		restartExecutionId: undefined,
		evalNodeMockHandler: undefined,
	});
	const runExecutionData = createRunExecutionData({
		executionData: {
			nodeExecutionStack: [{ node, data: { main: [[{ json: {} }]] }, source: null }],
		},
	});
	return { workflow, additionalData, runExecutionData, seen };
}

test('waits for asynchronous configuration before a node can execute', async () => {
	const fixture = execution();
	const configured = Promise.withResolvers<undefined>();
	let configuring = false;
	const started = startPreparedWorkflow({
		...fixture,
		mode: 'trigger',
		configureAdditionalData: async (additionalData) => {
			configuring = true;
			await configured.promise;
			additionalData.variables.value = 'configured';
		},
	});
	await vi.waitFor(() => expect(configuring).toBe(true));
	await expect(
		Promise.race([
			started.then(() => 'started'),
			new Promise((resolve) => setImmediate(() => resolve('pending'))),
		]),
	).resolves.toBe('pending');
	expect(fixture.seen).toEqual([]);
	configured.resolve(undefined);
	const { execution: running } = await started;
	const result = await running;
	expect(result.data.resultData.error).toBeUndefined();
	expect(fixture.seen).toEqual(['configured']);
});

test('does not execute a node when configuration fails', async () => {
	const fixture = execution();
	await expect(
		startPreparedWorkflow({
			...fixture,
			mode: 'trigger',
			configureAdditionalData: async () => {
				throw new Error('Configuration failed');
			},
		}),
	).rejects.toThrow('Configuration failed');
	expect(fixture.seen).toEqual([]);
});
