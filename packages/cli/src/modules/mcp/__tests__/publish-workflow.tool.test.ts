import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { v4 as uuid } from 'uuid';

import { createWorkflow } from './mock.utils';
import { createPublishWorkflowTool } from '../tools/publish-workflow.tool';

import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';

describe('publish-workflow MCP tool', () => {
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
			const tool = createPublishWorkflowTool(
				user,
				workflowFinderService,
				workflowService,
				telemetry,
			);

			expect(tool.name).toBe('publish_workflow');
			expect(tool.config).toBeDefined();
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.description).toContain('Publish');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		describe('workflow validation', () => {
			test('returns error response when workflow validation fails', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				const tool = createPublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'any-workflow', versionId: undefined },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: false,
					workflowId: 'any-workflow',
					activeVersionId: null,
					error: expect.any(String),
				});
			});
		});

		describe('successful publish', () => {
			test('publishes workflow successfully', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: true } });
				const activeVersionId = uuid();
				const activatedWorkflow = { ...workflow, activeVersionId };

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowService.activateWorkflow as jest.Mock).mockResolvedValue(activatedWorkflow);

				const tool = createPublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'wf-1', versionId: undefined },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: true,
					workflowId: 'wf-1',
					activeVersionId,
				});

				expect(workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
					versionId: undefined,
				});
			});

			test('publishes specific version when versionId provided', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: true } });
				const versionId = uuid();
				const activatedWorkflow = { ...workflow, activeVersionId: versionId };

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowService.activateWorkflow as jest.Mock).mockResolvedValue(activatedWorkflow);

				const tool = createPublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'wf-1', versionId },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: true,
					workflowId: 'wf-1',
					activeVersionId: versionId,
				});

				expect(workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
					versionId,
				});
			});
		});

		describe('telemetry tracking', () => {
			test('tracks successful publish', async () => {
				const workflow = createWorkflow({ settings: { availableInMCP: true } });
				const activeVersionId = uuid();
				const activatedWorkflow = { ...workflow, activeVersionId };

				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(workflow);
				(workflowService.activateWorkflow as jest.Mock).mockResolvedValue(activatedWorkflow);

				const tool = createPublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				await tool.handler(
					{ workflowId: 'wf-1', versionId: undefined },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'publish_workflow',
						parameters: { workflowId: 'wf-1', versionId: undefined },
						results: {
							success: true,
							data: {
								workflow_id: 'wf-1',
								active_version_id: activeVersionId,
							},
						},
					}),
				);
			});

			test('tracks failed publish with error reason', async () => {
				(workflowFinderService.findWorkflowForUser as jest.Mock).mockResolvedValue(null);

				const tool = createPublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				await tool.handler(
					{ workflowId: 'missing-workflow', versionId: undefined },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(telemetry.track).toHaveBeenCalledWith(
					'User called mcp tool',
					expect.objectContaining({
						user_id: 'user-1',
						tool_name: 'publish_workflow',
						parameters: { workflowId: 'missing-workflow', versionId: undefined },
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
				(workflowService.activateWorkflow as jest.Mock).mockRejectedValue(
					new Error('Version not found'),
				);

				const tool = createPublishWorkflowTool(
					user,
					workflowFinderService,
					workflowService,
					telemetry,
				);

				const result = await tool.handler(
					{ workflowId: 'wf-1', versionId: undefined },
					{} as Parameters<typeof tool.handler>[1],
				);

				expect(result.structuredContent).toMatchObject({
					success: false,
					workflowId: 'wf-1',
					activeVersionId: null,
					error: 'Version not found',
				});
			});
		});
	});
});
