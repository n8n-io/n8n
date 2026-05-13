import type { InstanceAiContext } from '../../types';
import { createWorkflowContextTool, WORKFLOW_CONTEXT_TOOL_ID } from '../workflow-context.tool';

function ctxWithSnapshot(
	overrides: Partial<NonNullable<InstanceAiContext['currentWorkflowSnapshot']>> = {},
): InstanceAiContext {
	return {
		userId: 'u1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		currentWorkflowSnapshot: {
			workflowId: 'wf-1',
			name: 'Demo',
			nodes: [
				{ name: 'Trigger', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0] },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest', position: [200, 0] },
			],
			connections: { Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] } },
			activeNodeName: 'HTTP',
			...overrides,
		},
	} as unknown as InstanceAiContext;
}

function noSuspendCtx() {
	return { agent: { resumeData: undefined, suspend: undefined } } as never;
}

describe('workflow-context tool', () => {
	it('exposes the expected tool id and a description that mentions read-only', () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot());
		expect(tool.id).toBe(WORKFLOW_CONTEXT_TOOL_ID);
		expect(String((tool as { description: string }).description)).toMatch(/read-only/i);
	});

	it('describe-current-workflow returns nodes, connections, and triggers', async () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot());
		const result = await tool.execute!({ action: 'describe-current-workflow' }, noSuspendCtx());
		expect(result.workflowId).toBe('wf-1');
		expect(result.name).toBe('Demo');
		expect(result.nodes).toHaveLength(2);
		expect(result.connections).toEqual({
			Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] },
		});
		expect(result.triggerNodes).toEqual(['Trigger']);
	});

	it('get-current-node returns the node referenced by activeNodeName', async () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot());
		const result = await tool.execute!({ action: 'get-current-node' }, noSuspendCtx());
		expect(result.node?.name).toBe('HTTP');
	});

	it('get-current-node returns null when no node is active', async () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot({ activeNodeName: undefined }));
		const result = await tool.execute!({ action: 'get-current-node' }, noSuspendCtx());
		expect(result.node).toBeNull();
	});

	it('returns a clear error when no workflow snapshot is present', async () => {
		const ctx = { ...ctxWithSnapshot(), currentWorkflowSnapshot: undefined } as InstanceAiContext;
		const tool = createWorkflowContextTool(ctx);
		const result = await tool.execute!({ action: 'describe-current-workflow' }, noSuspendCtx());
		expect(result).toEqual({ error: 'no-open-workflow' });
	});
});
