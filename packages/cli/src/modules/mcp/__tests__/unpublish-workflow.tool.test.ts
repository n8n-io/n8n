import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';

import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createWorkflow } from './mock.utils';
import { createUnpublishWorkflowTool } from '../tools/unpublish-workflow.tool';

describe('unpublish-workflow MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let workflowService: WorkflowService;
	let telemetry: Telemetry;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		workflowService = mockInstance(WorkflowService);
		telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});
	});

	describe('smoke tests', () => {
		test('creates tool correctly', () => {
			const tool = createUnpublishWorkflowTool(
				user,
				workflowFinderService,
				workflowService,
				telemetry,
			);

			expect(tool.name).toBe('unpublish_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.description).toContain('Unpublish');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('workflow validation', () => {
			test('returns error response when workflow validation fails', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				const tool = createUnpublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'any-workflow' },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: false,
					workflowId: 'any-workflow',
					error: expect.any(String),
				});
			});
		});

		describe('successful unpublish', () => {
			test('unpublishes workflow successfully', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: true } });
				const deactivatedWorkflow = { ...workflow, activeVersionId: null, active: false };

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowService.deactivateWorkflow as jest.Mock).mockResolvedValue(deactivatedWorkflow);

				const tool = createUnpublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'wf-1' },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: true,
					workflowId: 'wf-1',
				});

				expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(user, 'wf-1');
			});
		});

		describe('telemetry tracking', () => {
			test('tracks successful unpublish', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: true } });
				const deactivatedWorkflow = { ...workflow, activeVersionId: null, active: false };

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowService.deactivateWorkflow as jest.Mock).mockResolvedValue(deactivatedWorkflow);

				const tool = createUnpublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				await tool.handler({ workflowId: 'wf-1' }, {} as Parameters<typeof tool.handler>[1]);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'unpublish_workflow',
						parameters: { workflowId: 'wf-1' },
						results: {
							success: true,
							data: {
								workflow_id: 'wf-1',
							},
						},
					}),
				);
			});

			test('tracks failed unpublish with error reason', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				const tool = createUnpublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				await tool.handler(
					{ workflowId: 'missing-workflow' },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'unpublish_workflow',
						parameters: { workflowId: 'missing-workflow' },
						results: {
							success: false,
							error: "Workflow not found or you don't have permission to access it.",
							error_reason: 'no_permission',
						},
					}),
				);
			});
		});

		describe('error handling', () => {
			test('handles WorkflowService errors gracefully', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: true } });
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowService.deactivateWorkflow as jest.Mock).mockRejectedValue(
					new Error('Deactivation failed'),
				);

				const tool = createUnpublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'wf-1' },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: false,
					workflowId: 'wf-1',
					error: 'Deactivation failed',
				});
			});
		});
	});
});
