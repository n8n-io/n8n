import { mockInstance } from '@n8n/backend-test-utils';
import type { WorkflowHistory } from '@n8n/db';
import { User } from '@n8n/db';
import type { Mock } from 'vitest';

import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { createWorkflow } from './mock.utils';
import { createGetWorkflowHistoryTool } from '../tools/get-workflow-history.tool';

type VersionMetadata = Omit<WorkflowHistory, 'nodes' | 'connections' | 'nodeGroups'>;

const createVersionMetadata = (overrides: Partial<VersionMetadata> = {}): VersionMetadata =>
	({
		versionId: 'v1',
		workflowId: 'wf-1',
		authors: 'Jane Doe',
		name: null,
		description: null,
		autosaved: false,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		...overrides,
	}) as VersionMetadata;

describe('get-workflow-history MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let workflowHistoryService: WorkflowHistoryService;
	let telemetry: Telemetry;

	beforeEach(() => {
		workflowFinderService = mockInstance(WorkflowFinderService);
		workflowHistoryService = mockInstance(WorkflowHistoryService);
		telemetry = mockInstance(Telemetry, { track: vi.fn() });
	});

	const buildTool = () =>
		createGetWorkflowHistoryTool(user, workflowFinderService, workflowHistoryService, telemetry);

	const callContext = {} as Parameters<ReturnType<typeof buildTool>['handler']>[1];

	describe('smoke tests', () => {
		test('creates tool correctly', () => {
			const tool = buildTool();

			expect(tool.name).toBe('get_workflow_history');
			expect(typeof tool.config.description).toBe('string');
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations?.readOnlyHint).toBe(true);
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler tests', () => {
		test('returns mapped version metadata with count', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getList as Mock).mockResolvedValue([
				createVersionMetadata({ versionId: 'v2', name: 'Named' }),
				createVersionMetadata({ versionId: 'v1' }),
			]);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', limit: undefined, offset: undefined },
				callContext,
			);

			expect(workflowHistoryService.getList).toHaveBeenCalledWith(user, 'wf-1', 50, 0);
			expect(result.structuredContent).toMatchObject({
				workflowId: 'wf-1',
				count: 2,
				versions: [
					expect.objectContaining({
						versionId: 'v2',
						name: 'Named',
						createdAt: '2024-01-01T00:00:00.000Z',
						updatedAt: '2024-01-02T00:00:00.000Z',
					}),
					expect.objectContaining({ versionId: 'v1' }),
				],
			});
		});

		test('passes through limit and offset', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(createWorkflow());
			(workflowHistoryService.getList as Mock).mockResolvedValue([]);

			const tool = buildTool();
			await tool.handler({ workflowId: 'wf-1', limit: 10, offset: 20 }, callContext);

			expect(workflowHistoryService.getList).toHaveBeenCalledWith(user, 'wf-1', 10, 20);
		});

		test('returns a structured error when the workflow is not accessible', async () => {
			(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(null);

			const tool = buildTool();
			const result = await tool.handler(
				{ workflowId: 'wf-1', limit: undefined, offset: undefined },
				callContext,
			);

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({
				success: false,
				workflowId: 'wf-1',
				versions: [],
				count: 0,
				error: "Workflow not found or you don't have permission to access it.",
			});
			expect(workflowHistoryService.getList).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'get_workflow_history',
					results: expect.objectContaining({ success: false }),
				}),
			);
		});
	});
});
