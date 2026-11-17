import type { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { type IExecutionResponse, User } from '@n8n/db';
import type { INode, IWorkflowExecutionDataProcess } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks/credentials-permission-checker';
import { McpEngineV2Service } from '@/modules/mcp/mcp-engine-v2.service';
import { McpService } from '@/modules/mcp/mcp.service';
import { NodeTypesProxy } from '@n8n/backend-services';
import { WorkflowRunner } from '@/workflow-runner';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { testWorkflow } from '../tools/test-workflow.tool';
import { createWorkflow } from './mock.utils';

const V2_EXECUTION_ID = '019a0000-0000-7000-8000-000000000001';

const trigger: INode = {
	id: 'node-1',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('test_workflow on engine v2', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let workflowFinderService: WorkflowFinderService;
	let workflowRunner: WorkflowRunner;
	let engineV2: McpEngineV2Service;
	let logger: Logger;
	const activeExecutions = mockInstance(ActiveExecutions);
	const mcpService = mockInstance(McpService, { isQueueMode: false });
	const nodeTypes = mockInstance(NodeTypesProxy);

	beforeEach(() => {
		vi.clearAllMocks();
		workflowFinderService = mockInstance(WorkflowFinderService);
		workflowRunner = mockInstance(WorkflowRunner);
		logger = mockLogger();
		mockInstance(CredentialsPermissionChecker);
		nodeTypes.getByNameAndVersion.mockReturnValue({
			description: { group: ['trigger'] },
		} as never);
		engineV2 = mockInstance(McpEngineV2Service, {
			routesManualRunToV2: vi.fn().mockReturnValue(true),
			toManualRunData: vi.fn(
				(base, triggerName, pinData) =>
					({
						...base,
						executionMode: 'manual',
						triggerToStartFrom: { name: triggerName },
						pinData,
					}) as IWorkflowExecutionDataProcess,
			),
			waitForSettled: vi.fn().mockResolvedValue({ kind: 'settled' }),
		});

		const workflow = createWorkflow({
			settings: { availableInMCP: true, engineType: 'v2' },
			nodes: [trigger],
		});
		(workflowFinderService.findWorkflowForUser as Mock).mockResolvedValue(workflow);
		(workflowRunner.run as Mock).mockResolvedValue(V2_EXECUTION_ID);
	});

	const run = async () =>
		await testWorkflow(
			user,
			workflowFinderService,
			activeExecutions,
			workflowRunner,
			nodeTypes,
			mcpService,
			logger,
			engineV2,
			'wf-1',
			{ Trigger: [{ json: { id: 1 } }] },
		);

	// The v1 shape with `startNodes` reads to engine v2 as a run that starts at a
	// pinned node, which it refuses, so the v2 run names its trigger instead.
	test('starts the run from the trigger with the pinned payload, not from start nodes', async () => {
		(engineV2.readExecution as Mock).mockResolvedValue({
			status: 'success',
			data: { resultData: { runData: {} } },
		} as IExecutionResponse);

		const result = await run();

		const runData = (workflowRunner.run as Mock).mock.calls[0][0] as IWorkflowExecutionDataProcess;
		expect(runData.triggerToStartFrom).toEqual({ name: 'Trigger' });
		expect(runData.startNodes).toBeUndefined();
		expect(runData.executionData).toBeUndefined();
		expect(runData.pinData).toEqual({ Trigger: [{ json: { id: 1 } }] });
		expect(result).toEqual({ executionId: V2_EXECUTION_ID, status: 'success', error: undefined });
	});

	test('waits on the data plane, never on active executions', async () => {
		(engineV2.readExecution as Mock).mockResolvedValue({
			status: 'success',
			data: { resultData: { runData: {} } },
		} as IExecutionResponse);

		await run();

		expect(engineV2.waitForSettled).toHaveBeenCalledWith(V2_EXECUTION_ID, 300_000);
		expect(activeExecutions.getPostExecutePromise).not.toHaveBeenCalled();
	});

	test('reports the run error from the redacted v2 execution', async () => {
		(engineV2.readExecution as Mock).mockResolvedValue({
			status: 'error',
			data: { resultData: { runData: {}, error: { message: 'Set failed' } } },
		} as IExecutionResponse);

		expect(await run()).toEqual({
			executionId: V2_EXECUTION_ID,
			status: 'error',
			error: 'Set failed',
		});
	});

	test('a timeout surfaces as the timeout error', async () => {
		(engineV2.waitForSettled as Mock).mockResolvedValue({ kind: 'timeout' });

		await expect(run()).rejects.toThrow(/timed out/);
	});
});
