import { mock } from 'jest-mock-extended';

import type { InstanceAiContext } from '../../types';
import { createWorkflowsTool } from '../workflows.tool';

describe('workflows(action="update")', () => {
	it('calls workflowService.updateFromWorkflowJSON with the provided workflow', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.permissions = { updateWorkflow: 'always_allow' } as InstanceAiContext['permissions'];
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
		ctx.permissions = { updateWorkflow: 'always_allow' } as InstanceAiContext['permissions'];
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

	it('returns denied without saving when updateWorkflow is blocked', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.permissions = { updateWorkflow: 'blocked' } as InstanceAiContext['permissions'];
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

		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: false,
			denied: true,
			reason: 'Action blocked by admin',
		});
	});

	it('suspends for confirmation before saving when updateWorkflow requires approval', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.permissions = { updateWorkflow: 'require_approval' } as InstanceAiContext['permissions'];
		ctx.workflowService.get = jest.fn().mockResolvedValue({ id: 'w1', name: 'Test Workflow' });
		ctx.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);
		const suspend = jest.fn().mockImplementation(async () => await new Promise(() => {}));
		const tool = createWorkflowsTool(ctx);

		void tool.execute!(
			{
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Test', nodes: [], connections: {} },
			},
			{ agent: { suspend } } as never,
		);

		await new Promise(process.nextTick);
		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend.mock.calls[0]?.[0]).toEqual(
			expect.objectContaining({
				message: expect.stringContaining('Update workflow "Test Workflow"'),
				severity: 'warning',
			}),
		);
	});

	it('saves after approval when updateWorkflow requires approval', async () => {
		const ctx = mock<InstanceAiContext>();
		ctx.permissions = { updateWorkflow: 'require_approval' } as InstanceAiContext['permissions'];
		ctx.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);
		const tool = createWorkflowsTool(ctx);

		const result = await tool.execute!(
			{
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Test', nodes: [], connections: {} },
			},
			{ agent: { resumeData: { approved: true } } } as never,
		);

		expect(ctx.workflowService.updateFromWorkflowJSON).toHaveBeenCalled();
		expect(result).toMatchObject({ success: true });
	});
});
