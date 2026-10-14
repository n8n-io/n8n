import type { z } from 'zod';

import type { InstanceAiContext, ReplacedToolAction } from '../../types';
import { createExecutionsTool } from '../executions.tool';
import { createNodesTool } from '../nodes.tool';
import { createWorkflowsTool } from '../workflows.tool';

function contextWith(replacedToolActions: ReplacedToolAction[]): InstanceAiContext {
	return { replacedToolActions, workflowService: {} } as unknown as InstanceAiContext;
}

function accepts(tool: { inputSchema?: unknown }, input: unknown): boolean {
	return (tool.inputSchema as z.ZodTypeAny).safeParse(input).success;
}

describe('replaced tool actions', () => {
	it('hides replaced workflow actions and keeps setup', () => {
		const tool = createWorkflowsTool(
			contextWith([
				{ toolName: 'workflows', action: 'list', replacementToolName: 'search_workflows' },
				{ toolName: 'workflows', action: 'publish', replacementToolName: 'publish_workflow' },
			]),
		);

		expect(accepts(tool, { action: 'list' })).toBe(false);
		expect(accepts(tool, { action: 'publish', workflowId: 'wf-1' })).toBe(false);
		expect(accepts(tool, { action: 'setup', workflowId: 'wf-1' })).toBe(true);
		expect(tool.description).toContain('call the `publish_workflow` tool instead');
	});

	it('hides replaced execution actions and keeps stop', () => {
		const tool = createExecutionsTool(
			contextWith([
				{ toolName: 'executions', action: 'run', replacementToolName: 'execute_workflow' },
			]),
		);

		expect(accepts(tool, { action: 'run', workflowId: 'wf-1' })).toBe(false);
		expect(accepts(tool, { action: 'stop', executionId: 'ex-1' })).toBe(true);
		expect(tool.description).toContain('call the `execute_workflow` tool instead');
	});

	it('hides replaced node actions and keeps suggested', () => {
		const tool = createNodesTool(
			contextWith([{ toolName: 'nodes', action: 'search', replacementToolName: 'search_nodes' }]),
		);

		expect(accepts(tool, { action: 'search', query: 'slack' })).toBe(false);
		expect(accepts(tool, { action: 'suggested', categories: ['chatbot'] })).toBe(true);
	});

	it('leaves tools unchanged without replacements', () => {
		const tool = createExecutionsTool(contextWith([]));

		expect(accepts(tool, { action: 'run', workflowId: 'wf-1' })).toBe(true);
		expect(tool.description).not.toContain('instead');
	});
});
