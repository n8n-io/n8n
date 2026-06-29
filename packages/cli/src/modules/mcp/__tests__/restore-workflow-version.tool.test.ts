import { mockInstance } from '@n8n/backend-test-utils';
import { User, WorkflowEntity } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { CollaborationService } from '@/collaboration/collaboration.service';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { createWorkflow, createWorkflowHistoryVersion } from './mock.utils';
import { createRestoreWorkflowVersionTool } from '../tools/workflow-builder/restore-workflow-version.tool';

const versionNodes: INode[] = [
	{
		id: 'node-1',
		name: 'Set',
		type: 'n8n-nodes-base.set',
		typeVersion: 3,
		position: [0, 0],
		parameters: {},
	},
];

describe('restore-workflow-version MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let workflowHistoryService: WorkflowHistoryService;
	let workflowService: WorkflowService;
	let telemetry: Telemetry;
	let collaborationService: CollaborationService;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		workflowHistoryService = mockInstance(WorkflowHistoryService);
		workflowService = mockInstance(WorkflowService);
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
		collaborationService = mockInstance(CollaborationService, {
			ensureWorkflowEditable: vi.fn().mockResolvedValue(undefined),
			broadcastWorkflowUpdate: vi.fn().mockResolvedValue(undefined),
		});
	});

	const buildTool = () =>
		createRestoreWorkflowVersionTool(
			user,
			workflowFinderService,
			workflowHistoryService,
			workflowService,
			telemetry,
			collaborationService,
		);

	const callContext = {} as Parameters<ReturnType<typeof buildTool>['handler']>[1];

	describe('smoke tests', () => {
		test('creates tool correctly', () => {
			const tool = buildTool();

			expect(tool.name).toBe('restore_workflow_version');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations?.readOnlyHint).toBe(false);
			expect(tool.config.annotations?.destructiveHint).toBe(true);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('restores the version via a forceSave update and reports the new version id', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getVersion as Mock).mockResolvedValue(
				createWorkflowHistoryVersion({
					workflowId: 'wf-1',
					versionId: 'v1',
					nodes: versionNodes,
					connections: { Set: { main: [] } },
					nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-1'] }],
				}),
			);
			(workflowService.update as Mock).mockResolvedValue({
				id: 'wf-1',
				versionId: 'new-version-id',
			});

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'v1' }, callContext);

			expect(workflowService.update).toHaveBeenCalledTimes(1);
			const [updateUser, updateEntity, updateWorkflowId, updateOptions] = (
				workflowService.update as Mock
			).mock.calls[0];
			expect(updateUser).toBe(user);
			expect(updateWorkflowId).toBe('wf-1');
			expect(updateEntity).toBeInstanceOf(WorkflowEntity);
			expect(updateEntity).toMatchObject({
				nodes: versionNodes,
				connections: { Set: { main: [] } },
				nodeGroups: [{ id: 'group-1', name: 'Group 1', nodeIds: ['node-1'] }],
			});
			expect(updateOptions).toMatchObject({ forceSave: true, source: 'n8n-mcp' });

			expect(result.structuredContent).toMatchObject({
				success: true,
				workflowId: 'wf-1',
				restoredFromVersionId: 'v1',
				newVersionId: 'new-version-id',
			});
			expect(collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith('wf-1', user.id);
		});

		test('clears the current node groups when restoring a version that had none', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getVersion as Mock).mockResolvedValue(
				createWorkflowHistoryVersion({
					workflowId: 'wf-1',
					versionId: 'v1',
					nodes: versionNodes,
					connections: { Set: { main: [] } },
					nodeGroups: [],
				}),
			);
			(workflowService.update as Mock).mockResolvedValue({
				id: 'wf-1',
				versionId: 'new-version-id',
			});

			const tool = buildTool();
			await tool.handler({ workflowId: 'wf-1', versionId: 'v1' }, callContext);

			const [, updateEntity] = (workflowService.update as Mock).mock.calls[0];
			expect(updateEntity.nodeGroups).toEqual([]);
		});

		test('returns a structured error when the workflow is not accessible', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'v1' }, callContext);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: 'wf-1',
				restoredFromVersionId: 'v1',
				newVersionId: null,
				error: expect.any(String),
			});
			expect(workflowService.update).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'restore_workflow_version',
					results: expect.objectContaining({
						success: false,
						error_reason: 'no_permission',
					}),
				}),
			);
		});

		test('returns a friendly error when the version is not found', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getVersion as Mock).mockRejectedValue(
				new WorkflowHistoryVersionNotFoundError(''),
			);

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'missing' }, callContext);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				error: expect.stringContaining("Version 'missing' was not found"),
			});
			expect(workflowService.update).not.toHaveBeenCalled();
		});

		test('does not update when the workflow is locked for editing', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(collaborationService.ensureWorkflowEditable as Mock).mockRejectedValue(
				new Error('Cannot modify workflow while it is being edited by a user in the editor.'),
			);

			const tool = buildTool();
			const result = await tool.handler({ workflowId: 'wf-1', versionId: 'v1' }, callContext);

			expect(result.structuredContent).toMatchObject({
				success: false,
				error: expect.stringContaining('being edited by a user'),
			});
			expect(workflowService.update).not.toHaveBeenCalled();
		});
	});
});
