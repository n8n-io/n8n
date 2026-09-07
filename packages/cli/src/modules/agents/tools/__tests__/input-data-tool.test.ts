import type {
	ExecuteAgentWorkflowContext,
	IRunExecutionData,
	INodeExecutionData,
} from 'n8n-workflow';

import { createInputDataTool } from '../input-data-tool';

function makeCtx() {
	return { parentTelemetry: undefined };
}

function makeContext(
	inputData: INodeExecutionData[],
	inputDataScope: 'item' | 'all',
): ExecuteAgentWorkflowContext {
	return {
		workflowId: 'wf-1',
		workflowName: 'Order processing',
		callingNodeName: 'Message an Agent',
		inputData,
		inputDataScope,
		exposeWorkflowData: false,
		nodes: [],
		runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
	};
}

describe('createInputDataTool', () => {
	it('builds a tool named fetch_input_data', () => {
		const tool = createInputDataTool(makeContext([], 'item'));
		expect(tool.name).toBe('fetch_input_data');
	});

	it('embeds workflow and node names in its system instruction', () => {
		const tool = createInputDataTool(makeContext([], 'item'));
		expect(tool.systemInstruction).toContain('Order processing');
		expect(tool.systemInstruction).toContain('Message an Agent');
	});

	it('explains the data format and truncated-only query usage in its system instruction', () => {
		const tool = createInputDataTool(makeContext([], 'item'));
		expect(tool.systemInstruction).toContain('not `items[0]`');
		expect(tool.systemInstruction).toContain('truncated');
	});

	it('returns the input items with scope when called without a query', async () => {
		const tool = createInputDataTool(makeContext([{ json: { a: 1 } }, { json: { a: 2 } }], 'all'));

		const result = await tool.handler!({}, makeCtx());

		expect(result).toEqual({
			scope: 'all',
			totalItems: 2,
			items: [{ json: { a: 1 } }, { json: { a: 2 } }],
			truncated: false,
		});
	});

	it('reports scope item for a single current item', async () => {
		const tool = createInputDataTool(makeContext([{ json: { only: true } }], 'item'));

		const result = (await tool.handler!({}, makeCtx())) as { scope: string; totalItems: number };

		expect(result.scope).toBe('item');
		expect(result.totalItems).toBe(1);
	});

	it('queries fields under the json wrapper across all input items', async () => {
		const tool = createInputDataTool(
			makeContext([{ json: { id: 1 } }, { json: { id: 2 } }], 'all'),
		);

		const result = await tool.handler!({ query: '[*].json.id' }, makeCtx());

		expect(result).toEqual({ query: '[*].json.id', result: [1, 2], truncated: false });
	});

	it('returns an error payload for an unsafe query', async () => {
		const tool = createInputDataTool(makeContext([{ json: { a: 1 } }], 'item'));

		const result = (await tool.handler!({ query: '[0].__proto__' }, makeCtx())) as {
			query: string;
			error: string;
		};

		expect(result.error).toContain('Query failed');
	});

	it('defaults to scope item with no items when context omits inputData and scope', async () => {
		const tool = createInputDataTool({
			workflowId: 'wf-1',
			workflowName: 'Order processing',
			callingNodeName: 'Message an Agent',
			exposeWorkflowData: false,
			nodes: [],
			runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
		});

		const result = await tool.handler!({}, makeCtx());

		expect(result).toEqual({ scope: 'item', totalItems: 0, items: [], truncated: false });
	});
});
