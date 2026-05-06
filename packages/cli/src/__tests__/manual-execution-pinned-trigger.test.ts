/**
 * @file Regression test for GHC-8185
 * @see https://github.com/n8n-io/n8n/issues/29907
 *
 * Bug: When manually re-running an execution with pinned trigger data,
 * the system uses data from a different/random execution instead of
 * the pinned one.
 *
 * Reproduction steps:
 * 1. Execute a workflow multiple times (execution 1, 2, 3, etc.)
 * 2. Copy execution 5 to editor by pinning the trigger node data
 * 3. Click "Execute Workflow" button
 * 4. Expected: Uses pinned data from execution 5
 * 5. Actual: Uses data from a different execution (random/most recent)
 */

import { mock } from 'jest-mock-extended';
import * as core from 'n8n-core';
import { WorkflowExecute, recreateNodeExecutionStack, DirectedGraph } from 'n8n-core';
import type {
	Workflow,
	IWorkflowExecutionDataProcess,
	IWorkflowExecuteAdditionalData,
	IPinData,
	ITaskData,
	INode,
	IExecuteData,
	IWaitingForExecution,
	IWaitingForExecutionSource,
} from 'n8n-workflow';
import type PCancelable from 'p-cancelable';

import { ManualExecutionService } from '@/manual-execution.service';

jest.mock('n8n-core');

describe('ManualExecutionService - Pinned Trigger Data (GHC-8185)', () => {
	const manualExecutionService = new ManualExecutionService(mock());
	const nodeExecutionStack = mock<IExecuteData[]>();
	const waitingExecution = mock<IWaitingForExecution>();
	const waitingExecutionSource = mock<IWaitingForExecutionSource>();
	const mockFilteredGraph = mock<DirectedGraph>();

	beforeEach(() => {
		jest.spyOn(DirectedGraph, 'fromWorkflow').mockReturnValue(mock<DirectedGraph>());
		jest.spyOn(core, 'recreateNodeExecutionStack').mockReturnValue({
			nodeExecutionStack,
			waitingExecution,
			waitingExecutionSource,
		});
		jest.spyOn(core, 'filterDisabledNodes').mockReturnValue(mockFilteredGraph);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should use correct trigger data when triggerToStartFrom.data is provided', async () => {
		// GHC-8185: This test verifies that when a user pins trigger data from a specific execution,
		// the manual execution uses THAT data, not data from a different execution.

		// Arrange: Simulate user scenario
		const triggerNodeName = 'Webhook';
		const downstreamNodeName = 'Code';

		// This is the data from execution 5 that user wants to use (pinned in UI)
		const execution5TriggerData = mock<ITaskData>({
			executionTime: 150,
			startTime: 1704452400000, // 2024-01-05 10:00:00
			data: {
				main: [
					[
						{
							json: {
								executionId: 5,
								message: 'Data from execution 5',
								timestamp: '2024-01-05T10:00:00Z',
							},
						},
					],
				],
			},
		});

		const triggerNode = mock<INode>({ name: triggerNodeName });
		const downstreamNode = mock<INode>({ name: downstreamNodeName });

		const workflow = mock<Workflow>({
			getNode: jest.fn((name) => {
				if (name === triggerNodeName) return triggerNode;
				if (name === downstreamNodeName) return downstreamNode;
				return null;
			}),
		});

		// User has pinned execution 5's trigger data in the UI
		const pinData: IPinData = {
			[triggerNodeName]: [
				{
					json: {
						executionId: 5,
						message: 'Data from execution 5',
						timestamp: '2024-01-05T10:00:00Z',
					},
				},
			],
		};

		// When user clicks "Execute Workflow", this is what should be sent
		const executionData = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: {
				name: triggerNodeName,
				data: execution5TriggerData, // THIS is the key: explicit trigger data from execution 5
			},
			startNodes: [{ name: downstreamNodeName }],
			executionMode: 'manual',
			pinData,
		});

		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		const executionId = 'test-exec-ghc-8185';

		// Mock WorkflowExecute to capture what data is actually passed for execution
		let capturedExecutionData: any = null;
		(core.WorkflowExecute as jest.Mock).mockImplementationOnce((additionalData, mode, execData) => {
			capturedExecutionData = execData;
			return mock<WorkflowExecute>({
				processRunExecutionData: jest.fn().mockResolvedValue(mock<PCancelable<any>>()),
			});
		});

		// Act: Run the manual execution
		await manualExecutionService.runManually(
			executionData,
			workflow,
			additionalData,
			executionId,
			pinData,
		);

		// Assert: Verify that execution 5's trigger data was used
		expect(core.WorkflowExecute).toHaveBeenCalled();
		expect(capturedExecutionData).toBeDefined();

		// The runData should contain execution 5's trigger data
		const runData = capturedExecutionData.resultData?.runData;
		expect(runData).toBeDefined();
		expect(runData[triggerNodeName]).toBeDefined();

		// Check that the correct trigger data is used
		const actualTriggerData = runData[triggerNodeName][0];
		expect(actualTriggerData).toStrictEqual(execution5TriggerData);
		expect(actualTriggerData.executionTime).toBe(150);
		expect(actualTriggerData.data.main[0][0].json.executionId).toBe(5);
		expect(actualTriggerData.data.main[0][0].json.message).toBe('Data from execution 5');

		// The pinData should also be passed correctly
		expect(capturedExecutionData.resultData?.pinData).toStrictEqual(pinData);
	});

	it('should NOT use random/stale execution data when explicit triggerToStartFrom.data exists', async () => {
		// GHC-8185: This test verifies the bug - system should NOT use data from
		// a different execution when explicit trigger data is provided

		const triggerNodeName = 'Schedule Trigger';

		// User wants execution 3's data (explicitly pinned)
		const execution3Data = mock<ITaskData>({
			data: {
				main: [[{ json: { executionId: 3, value: 'correct-from-execution-3' } }]],
			},
		});

		// System might accidentally use execution 7's data (wrong!)
		const execution7Data = mock<ITaskData>({
			data: {
				main: [[{ json: { executionId: 7, value: 'wrong-from-execution-7' } }]],
			},
		});

		const triggerNode = mock<INode>({ name: triggerNodeName });
		const workflow = mock<Workflow>({
			getNode: jest.fn(() => triggerNode),
		});

		const executionData = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: {
				name: triggerNodeName,
				data: execution3Data, // Explicitly requesting execution 3's data
			},
			startNodes: [{ name: 'CodeNode' }],
			executionMode: 'manual',
			// Simulate potential sources of wrong data
			runData: {
				// This might be stale data from a previous execution
				[triggerNodeName]: [execution7Data],
			},
			pinData: {
				[triggerNodeName]: [{ json: { executionId: 3, value: 'correct-from-execution-3' } }],
			},
		});

		const additionalData = mock<IWorkflowExecuteAdditionalData>();

		let capturedRunData: any = null;
		(core.WorkflowExecute as jest.Mock).mockImplementationOnce((additionalData, mode, execData) => {
			capturedRunData = execData?.resultData?.runData;
			return mock<WorkflowExecute>({
				processRunExecutionData: jest.fn().mockResolvedValue(mock<PCancelable<any>>()),
			});
		});

		// Act
		await manualExecutionService.runManually(
			executionData,
			workflow,
			additionalData,
			'test-exec-id',
			executionData.pinData,
		);

		// Assert: Should use execution 3's data, NOT execution 7's
		expect(capturedRunData).toBeDefined();
		expect(capturedRunData[triggerNodeName]).toBeDefined();

		// This is the key assertion: we should get execution 3's data
		const actualTriggerData = capturedRunData[triggerNodeName][0];
		expect(actualTriggerData).toStrictEqual(execution3Data);
		expect(actualTriggerData.data.main[0][0].json.executionId).toBe(3);
		expect(actualTriggerData.data.main[0][0].json.value).toBe('correct-from-execution-3');

		// Should NOT be execution 7's data (verify it's not the wrong data)
		expect(actualTriggerData.data.main[0][0].json.executionId).not.toBe(7);
		expect(actualTriggerData.data.main[0][0].json.value).not.toBe('wrong-from-execution-7');
	});

	it('should preserve trigger execution metadata when using triggerToStartFrom.data', async () => {
		// GHC-8185: When user pins trigger data from a specific execution,
		// all metadata (execution time, timestamps, etc.) should also be preserved

		const triggerNodeName = 'Manual Trigger';
		const specificExecutionTime = 250;
		const specificStartTime = 1704538800000; // 2024-01-06 10:00:00

		const specificTriggerData = mock<ITaskData>({
			executionTime: specificExecutionTime,
			startTime: specificStartTime,
			data: {
				main: [[{ json: { id: 'abc-123', specificField: 'specificValue' } }]],
			},
			source: null,
		});

		const triggerNode = mock<INode>({ name: triggerNodeName });
		const workflow = mock<Workflow>({
			getNode: jest.fn(() => triggerNode),
		});

		const executionData = mock<IWorkflowExecutionDataProcess>({
			triggerToStartFrom: {
				name: triggerNodeName,
				data: specificTriggerData,
			},
			startNodes: [{ name: 'NextNode' }],
			executionMode: 'manual',
			pinData: {
				[triggerNodeName]: [{ json: { id: 'abc-123', specificField: 'specificValue' } }],
			},
		});

		const additionalData = mock<IWorkflowExecuteAdditionalData>();

		let capturedRunData: any = null;
		(core.WorkflowExecute as jest.Mock).mockImplementationOnce((additionalData, mode, execData) => {
			capturedRunData = execData?.resultData?.runData;
			return mock<WorkflowExecute>({
				processRunExecutionData: jest.fn().mockResolvedValue(mock<PCancelable<any>>()),
			});
		});

		// Act
		await manualExecutionService.runManually(
			executionData,
			workflow,
			additionalData,
			'test-exec-metadata',
			executionData.pinData,
		);

		// Assert: All metadata should be preserved
		expect(capturedRunData).toBeDefined();
		const actualData = capturedRunData[triggerNodeName][0];
		expect(actualData).toStrictEqual(specificTriggerData);
		expect(actualData.executionTime).toBe(specificExecutionTime);
		expect(actualData.startTime).toBe(specificStartTime);
		expect(actualData.data.main[0][0].json.id).toBe('abc-123');
		expect(actualData.data.main[0][0].json.specificField).toBe('specificValue');
	});
});
