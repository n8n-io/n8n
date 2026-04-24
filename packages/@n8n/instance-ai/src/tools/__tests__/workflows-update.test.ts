import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../types';
import { createWorkflowsTool } from '../workflows.tool';

describe('workflows(action="update")', () => {
	it('calls workflowService.updateFromWorkflowJSON with the provided workflow', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);
		const tool = createWorkflowsTool(ctx);

		const result = await tool.execute!(
			{
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Test', nodes: [], connections: {} },
			},
			{ agent: {} } as never,
		);

		expect(ctx.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith('w1', {
			name: 'Test',
			nodes: [],
			connections: {},
		});
		expect(result).toMatchObject({ success: true, workflowId: 'w1' });
	});

	it('returns success:false with error message when workflowService throws', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.workflowService.updateFromWorkflowJSON = jest
			.fn()
			.mockRejectedValue(new Error('save failed: invalid node connection'));
		const tool = createWorkflowsTool(ctx);

		const result = await tool.execute!(
			{
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Test', nodes: [], connections: {} },
			},
			{ agent: {} } as never,
		);

		expect(result).toMatchObject({
			success: false,
			error: expect.stringContaining('save failed') as unknown,
		});
	});

	it('works in orchestrator surface too', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);
		const tool = createWorkflowsTool(ctx, 'orchestrator');

		const result = await tool.execute!(
			{
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Test', nodes: [], connections: {} },
			},
			{ agent: {} } as never,
		);

		expect(result).toMatchObject({ success: true });
	});
});
