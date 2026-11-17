import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionRepository, type IExecutionResponse, User } from '@n8n/db';
import type { Mock } from 'vitest';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { McpEngineV2Service } from '@/modules/mcp/mcp-engine-v2.service';
import { ExecutionRedactionServiceProxy } from '@n8n/backend-services';
import { Telemetry } from '@/telemetry';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { createGetExecutionTool } from '../tools/get-execution.tool';

const V2_EXECUTION_ID = '019a0000-0000-7000-8000-000000000001';

describe('get_workflow_execution on engine v2', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	const executionRepository = mockInstance(ExecutionRepository);
	const executionPersistence = mockInstance(ExecutionPersistence);
	const workflowFinderService = mockInstance(WorkflowFinderService);
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	const redaction = mockInstance(ExecutionRedactionServiceProxy);
	const engineV2 = mockInstance(McpEngineV2Service);

	const startedAt = new Date('2026-11-16T10:00:00.000Z');
	const v2Execution = {
		id: V2_EXECUTION_ID,
		workflowId: 'workflow-1',
		mode: 'manual',
		status: 'success',
		startedAt,
		stoppedAt: startedAt,
		data: { resultData: { runData: { Set: [] } } },
	} as unknown as IExecutionResponse;

	const tool = createGetExecutionTool(
		user,
		executionRepository,
		workflowFinderService,
		telemetry,
		redaction,
		engineV2,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue({
			id: 'workflow-1',
			settings: { availableInMCP: true },
		});
		(engineV2.readExecution as Mock).mockResolvedValue(v2Execution);
	});

	test.each([false, true])(
		'reads a UUID id from the data plane, scoped to the workflow (includeData: %s)',
		async (includeData) => {
			const result = await tool.handler(
				{
					workflowId: 'workflow-1',
					executionId: V2_EXECUTION_ID,
					includeData,
					nodeNames: undefined,
					truncateData: undefined,
				},
				{} as never,
			);

			expect(engineV2.readExecution).toHaveBeenCalledWith(V2_EXECUTION_ID, 'workflow-1', user);
			expect(executionRepository.findIfAccessible).not.toHaveBeenCalled();
			expect(executionPersistence.findWithUnflattenedData).not.toHaveBeenCalled();
			expect(result.structuredContent).toMatchObject({
				execution: { id: V2_EXECUTION_ID, status: 'success', mode: 'manual' },
			});
			if (includeData) {
				expect(result.structuredContent).toMatchObject({ data: v2Execution.data });
			} else {
				expect(result.structuredContent).not.toHaveProperty('data');
			}
		},
	);

	test('reports a v2 execution the data plane does not have for this workflow as not found', async () => {
		(engineV2.readExecution as Mock).mockResolvedValue(undefined);

		const result = await tool.handler(
			{
				workflowId: 'workflow-1',
				executionId: V2_EXECUTION_ID,
				includeData: false,
				nodeNames: undefined,
				truncateData: undefined,
			},
			{} as never,
		);

		expect(result.structuredContent).toMatchObject({
			execution: null,
			error: `Execution '${V2_EXECUTION_ID}' not found for workflow 'workflow-1'`,
		});
	});
});
