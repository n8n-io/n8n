import type {
	IConnections,
	INode,
	INodeParameters,
	INodeType,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { resolveNodeParametersFromRun } from '@/executions/resolve-node-parameters-from-run';
import type { NodeTypes } from '@/node-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a task data entry with the given output items. */
function makeTaskData(
	outputItems: Array<Record<string, unknown>>,
	opts?: {
		source?: Array<{
			previousNode: string;
			previousNodeOutput?: number;
			previousNodeRun?: number;
		} | null>;
	},
): ITaskData {
	return {
		startTime: 1000,
		executionTime: 500,
		executionIndex: 0,
		source: opts?.source ?? [],
		data: {
			main: [outputItems.map((json) => ({ json }))],
		},
	} as unknown as ITaskData;
}

function makeNode(name: string, type: string, parameters: INodeParameters = {}): INode {
	return {
		id: name,
		name,
		type,
		typeVersion: 1,
		position: [0, 0],
		parameters,
	};
}

/** Connect `from` → `to` on the `main` connection (output index 0 → input index 0). */
function connect(from: string, to: string): IConnections {
	return {
		[from]: { main: [[{ node: to, type: 'main', index: 0 }]] },
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resolveNodeParametersFromRun', () => {
	const nodeTypes = mock<NodeTypes>();

	it('replays expressions against the recorded parent output', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const gmail = makeNode('Gmail', 'n8n-nodes-base.gmail', {
			sendTo: '={{ $json.to }}',
			subject: '=Re: {{ $json.subject }}',
			message: 'static body',
		});

		const result = await resolveNodeParametersFromRun({
			workflowData: {
				id: 'wf',
				name: 'Test',
				nodes: [trigger, gmail],
				connections: connect('Trigger', 'Gmail'),
				settings: {},
			},
			runExecutionData: {
				resultData: {
					runData: {
						Trigger: [makeTaskData([{ to: 'anna@example.com', subject: 'Invoice' }])],
						Gmail: [
							makeTaskData([{ id: '1' }], {
								source: [{ previousNode: 'Trigger', previousNodeOutput: 0, previousNodeRun: 0 }],
							}),
						],
					},
				},
			} as unknown as IRunExecutionData,
			nodeName: 'Gmail',
			nodeTypes,
		});

		expect(result.runIndex).toBe(0);
		expect(result.resolved).toEqual({
			sendTo: 'anna@example.com',
			subject: 'Re: Invoice',
			message: 'static body',
		});
		expect(result.failedExpressions).toEqual([]);
	});

	it("applies node-type defaults to the walked tree without mutating the caller's nodes", async () => {
		// `Workflow` applies defaults by mutating the node objects it is given. The
		// helper must clone them (the caller's workflow stays pristine) while still
		// exposing the defaults-applied tree in `parameters` / `resolved`.
		const nodeTypesWithDefaults = mock<NodeTypes>();
		nodeTypesWithDefaults.getByNameAndVersion.mockImplementation(
			(type) =>
				(type === 'n8n-nodes-base.gmail'
					? {
							description: {
								properties: [
									{
										displayName: 'Operation',
										name: 'operation',
										type: 'options',
										options: [{ name: 'Send', value: 'send' }],
										default: 'send',
									},
									{ displayName: 'To', name: 'sendTo', type: 'string', default: '' },
								],
							},
						}
					: undefined) as unknown as INodeType,
		);

		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const gmail = makeNode('Gmail', 'n8n-nodes-base.gmail', { sendTo: '={{ $json.to }}' });
		const originalParameters = gmail.parameters;

		const result = await resolveNodeParametersFromRun({
			workflowData: {
				id: 'wf',
				name: 'Test',
				nodes: [trigger, gmail],
				connections: connect('Trigger', 'Gmail'),
				settings: {},
			},
			runExecutionData: {
				resultData: { runData: { Trigger: [makeTaskData([{ to: 'anna@example.com' }])] } },
			} as unknown as IRunExecutionData,
			nodeName: 'Gmail',
			nodeTypes: nodeTypesWithDefaults,
		});

		expect(result.parameters).toEqual({ operation: 'send', sendTo: '={{ $json.to }}' });
		expect(result.resolved).toEqual({ operation: 'send', sendTo: 'anna@example.com' });
		// Caller's node object is untouched: same reference, no defaults injected.
		expect(gmail.parameters).toBe(originalParameters);
		expect(gmail.parameters).toEqual({ sendTo: '={{ $json.to }}' });
	});

	it('reports empty and failed resolutions instead of throwing', async () => {
		const trigger = makeNode('Trigger', 'n8n-nodes-base.manualTrigger');
		const set = makeNode('Set', 'n8n-nodes-base.set', {
			a: '={{ $json.missing }}',
			b: '={{ $vars.secret }}',
		});

		const result = await resolveNodeParametersFromRun({
			workflowData: {
				id: 'wf',
				name: 'Test',
				nodes: [trigger, set],
				connections: connect('Trigger', 'Set'),
				settings: {},
			},
			runExecutionData: {
				resultData: { runData: { Trigger: [makeTaskData([{ x: 1 }])] } },
			} as unknown as IRunExecutionData,
			nodeName: 'Set',
			nodeTypes,
		});

		expect(result.emptyResolutions.map((e) => e.path)).toContain('a');
		expect(result.failedExpressions.length + result.emptyResolutions.length).toBeGreaterThanOrEqual(
			2,
		);
	});
});
