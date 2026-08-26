import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiContext, InstanceAiWorkflowService, NodeUsageResult } from '../../types';
import { createWorkflowsTool } from '../workflows.tool';

function makeContext(
	nodeUsage: (options?: unknown) => Promise<NodeUsageResult>,
): InstanceAiContext {
	const context = mock<InstanceAiContext>();
	context.workflowService = mock<InstanceAiWorkflowService>({ nodeUsage } as never);
	return context;
}

describe('workflows(action="node-usage")', () => {
	it('returns the histogram against the scope total, so a count means something', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({
			workflowsInScope: 10,
			nodeTypes: [
				{ nodeType: '@n8n/n8n-nodes-langchain.lmChatAnthropic', workflowCount: 10 },
				{ nodeType: 'n8n-nodes-base.linear', workflowCount: 8 },
			],
		});
		const tool = createWorkflowsTool(makeContext(nodeUsage), 'orchestrator');

		const output = await executeTool<{
			workflowsInScope: number;
			nodeTypes: Array<{ nodeType: string; workflowCount: number }>;
			note: string;
		}>(tool, { action: 'node-usage' });

		expect(nodeUsage).toHaveBeenCalledWith({});
		expect(output.workflowsInScope).toBe(10);
		expect(output.nodeTypes[0].workflowCount).toBe(10);
		// The note is what stops an absent node type reading as a gap in the answer.
		expect(output.note).toContain('absent from this list is used by no workflow');
		expect(output.note).toContain('read one workflow with get');
	});

	it('names the workflows using one node type, and passes the filters through', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({
			workflowsInScope: 10,
			workflows: [
				{ workflowId: 'wf2', name: 'Newest', updatedAt: '2026-08-26T10:00:00.000Z' },
				{ workflowId: 'wf1', name: 'Older', updatedAt: '2026-08-20T10:00:00.000Z' },
			],
		});
		const tool = createWorkflowsTool(makeContext(nodeUsage), 'orchestrator');

		const output = await executeTool<{
			nodeType: string;
			workflows: Array<{ workflowId: string }>;
		}>(tool, {
			action: 'node-usage',
			nodeType: 'n8n-nodes-base.linear',
			limit: 5,
			scope: 'instance',
		});

		expect(nodeUsage).toHaveBeenCalledWith({
			nodeType: 'n8n-nodes-base.linear',
			limit: 5,
			scope: 'instance',
		});
		expect(output.nodeType).toBe('n8n-nodes-base.linear');
		// Newest first: the freshest example is the one worth reading.
		expect(output.workflows.map((w) => w.workflowId)).toEqual(['wf2', 'wf1']);
	});

	it('reports truncation rather than presenting a partial list as the whole', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({
			workflowsInScope: 40,
			workflows: [{ workflowId: 'wf1', name: 'One', updatedAt: '2026-08-26T10:00:00.000Z' }],
			truncated: true,
		});
		const tool = createWorkflowsTool(makeContext(nodeUsage), 'orchestrator');

		const output = await executeTool<{ truncated?: boolean }>(tool, {
			action: 'node-usage',
			nodeType: 'n8n-nodes-base.set',
		});

		expect(output.truncated).toBe(true);
	});

	it('says nothing is in scope rather than inventing an empty histogram', async () => {
		const nodeUsage = vi.fn().mockResolvedValue({ workflowsInScope: 0 });
		const tool = createWorkflowsTool(makeContext(nodeUsage), 'orchestrator');

		const output = await executeTool<{ workflowsInScope: number; nodeTypes: unknown[] }>(tool, {
			action: 'node-usage',
		});

		expect(output.workflowsInScope).toBe(0);
		expect(output.nodeTypes).toEqual([]);
	});
});
