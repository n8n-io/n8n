import type { ExecuteAgentWorkflowContext, IRunExecutionData, ITaskData } from 'n8n-workflow';

import { createWorkflowContextTool } from '../workflow-context-tool';

function makeCtx() {
	return {
		parentTelemetry: undefined,
	};
}

function makeTaskData(
	items: Array<Record<string, unknown>>,
	overrides: Partial<ITaskData> = {},
): ITaskData {
	return {
		startTime: 0,
		executionIndex: 0,
		executionTime: 1,
		source: [],
		executionStatus: 'success',
		data: { main: [items.map((json) => ({ json }))] },
		...overrides,
	} as ITaskData;
}

function makeContext(runData: Record<string, ITaskData[]>): ExecuteAgentWorkflowContext {
	return {
		workflowId: 'wf-1',
		workflowName: 'Order processing',
		callingNodeName: 'Message an Agent',
		nodes: [
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
			{ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' },
			{ name: 'Message an Agent', type: 'n8n-nodes-base.messageAnAgent' },
		],
		runExecutionData: { resultData: { runData } } as unknown as IRunExecutionData,
	};
}

describe('createWorkflowContextTool', () => {
	it('builds a tool named fetch_workflow_context', () => {
		const tool = createWorkflowContextTool(makeContext({}));
		expect(tool.name).toBe('fetch_workflow_context');
	});

	it('describes the other-nodes purpose in its system instruction', () => {
		const tool = createWorkflowContextTool(makeContext({}));
		expect(tool.systemInstruction).toContain('OTHER earlier nodes');
		expect(tool.systemInstruction).toContain('fetch_workflow_context');
	});

	it('explains the data format and truncated-only query usage in its system instruction', () => {
		const tool = createWorkflowContextTool(makeContext({}));
		expect(tool.systemInstruction).toContain('not `items[0]`');
		expect(tool.systemInstruction).toContain('truncated');
	});

	it('returns an overview of executed nodes when called without nodeName', async () => {
		const tool = createWorkflowContextTool(
			makeContext({
				Webhook: [makeTaskData([{ a: 1 }, { a: 2 }])],
				'HTTP Request': [makeTaskData([{ b: 1 }]), makeTaskData([{ b: 2 }, { b: 3 }])],
			}),
		);

		const result = await tool.handler!({}, makeCtx());

		expect(result).toEqual({
			workflow: { id: 'wf-1', name: 'Order processing' },
			invokedBy: 'Message an Agent',
			executedNodes: [
				{
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					status: 'success',
					runs: 1,
					items: 2,
				},
				{
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					status: 'success',
					runs: 2,
					items: 2, // items of the LAST run
				},
			],
		});
	});

	it('returns the json items of the last run for a given node', async () => {
		const tool = createWorkflowContextTool(
			makeContext({
				Webhook: [makeTaskData([{ old: true }]), makeTaskData([{ fresh: 1 }, { fresh: 2 }])],
			}),
		);

		const result = await tool.handler!({ nodeName: 'Webhook' }, makeCtx());

		expect(result).toEqual({
			nodeName: 'Webhook',
			status: 'success',
			runs: 2,
			totalItems: 2,
			items: [{ json: { fresh: 1 } }, { json: { fresh: 2 } }],
			truncated: false,
		});
	});

	it('replaces binary data with key-name stubs', async () => {
		const taskData = makeTaskData([], {
			data: {
				main: [
					[
						{
							json: { fileName: 'report.pdf' },
							binary: { data: { data: 'AAAA', mimeType: 'application/pdf' } },
						},
					],
				],
			},
		});
		const tool = createWorkflowContextTool(makeContext({ Webhook: [taskData] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: Array<Record<string, unknown>>;
		};

		expect(result.items).toEqual([{ json: { fileName: 'report.pdf' }, binary: ['data'] }]);
	});

	it('caps node output at 20 items and flags truncation', async () => {
		const manyItems = Array.from({ length: 35 }, (_, i) => ({ index: i }));
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData(manyItems)] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: unknown[];
			totalItems: number;
			truncated: boolean;
		};

		expect(result.items).toHaveLength(20);
		expect(result.totalItems).toBe(35);
		expect(result.truncated).toBe(true);
	});

	it('stops accumulating items once the serialized size cap is exceeded', async () => {
		// Each item is ~30KB serialized; the 50KB cap admits the first item and
		// stops before the second.
		const bigItems = [{ blob: 'x'.repeat(30_000) }, { blob: 'y'.repeat(30_000) }];
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData(bigItems)] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: unknown[];
			truncated: boolean;
		};

		expect(result.items).toHaveLength(1);
		expect(result.truncated).toBe(true);
	});

	it('substitutes a bounded preview when the first item alone exceeds the size cap', async () => {
		const oversized = [{ blob: 'x'.repeat(60_000) }];
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData(oversized)] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: Array<{ jsonPreview?: string; itemTruncated?: boolean }>;
			truncated: boolean;
		};

		expect(result.items).toHaveLength(1);
		expect(result.items[0].itemTruncated).toBe(true);
		expect(result.items[0].jsonPreview).toHaveLength(50_000);
		expect(result.truncated).toBe(true);
	});

	it('returns an error payload with available node names for an unknown node', async () => {
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData([{ a: 1 }])] }));

		const result = await tool.handler!({ nodeName: 'Nope' }, makeCtx());

		expect(result).toEqual({
			error: "No execution data found for node 'Nope'.",
			availableNodes: ['Webhook'],
		});
	});

	it('treats prototype-chain keys as unknown nodes', async () => {
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData([{ a: 1 }])] }));

		const result = await tool.handler!({ nodeName: 'constructor' }, makeCtx());

		expect(result).toEqual({
			error: "No execution data found for node 'constructor'.",
			availableNodes: ['Webhook'],
		});
	});

	it('queries fields under the json wrapper of a node last-run output', async () => {
		const tool = createWorkflowContextTool(
			makeContext({ Webhook: [makeTaskData([{ id: 1 }, { id: 2 }])] }),
		);

		const result = await tool.handler!({ nodeName: 'Webhook', query: '[*].json.id' }, makeCtx());

		expect(result).toEqual({
			nodeName: 'Webhook',
			query: '[*].json.id',
			result: [1, 2],
			truncated: false,
		});
	});

	it('returns an error when a query is given without a nodeName', async () => {
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData([{ a: 1 }])] }));

		const result = (await tool.handler!({ query: '[*].a' }, makeCtx())) as { error: string };

		expect(result.error).toContain('Specify a nodeName');
	});

	it('returns an empty executedNodes list when no node has run', async () => {
		const tool = createWorkflowContextTool(makeContext({}));

		const result = await tool.handler!({}, makeCtx());

		expect(result).toEqual({
			workflow: { id: 'wf-1', name: 'Order processing' },
			invokedBy: 'Message an Agent',
			executedNodes: [],
		});
	});

	it('returns a recoverable error payload when run data is malformed', async () => {
		const tool = createWorkflowContextTool(
			// `main` is not an array of branches — materializing it would throw.
			makeContext({ Webhook: [makeTaskData([], { data: { main: 42 } as never })] }),
		);

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as { error: string };

		expect(result.error).toContain('Failed to read workflow context');
	});
});
