import { mockLogger } from '@n8n/backend-test-utils';
import type { IExecutionResponse } from '@n8n/db';
import { OperationalError } from '@n8n/errors';
import {
	createRunExecutionData,
	WAIT_INDEFINITELY,
	type IExecuteData,
	type INode,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import type { WaitTracker } from '@/wait-tracker';
import type { ExecutionPersistence } from '../execution-persistence';
import { ResponseWaitTracker } from '../response-wait-tracker.service';

function setup() {
	const executions = mock<ExecutionPersistence>();
	const core = mock<WaitTracker>();
	const logger = mockLogger();
	const node: INode = {
		id: 'node',
		name: 'Review',
		type: 'test',
		typeVersion: 1,
		parameters: {},
		position: [0, 0],
		disabled: false,
	};
	const entry: IExecuteData = {
		node,
		data: { main: [[{ json: { original: true } }]] },
		source: null,
	};
	const data = createRunExecutionData({
		executionData: { nodeExecutionStack: [entry] },
		resultData: {
			runData: {
				Review: [
					{
						startTime: 0,
						executionIndex: 0,
						executionTime: 0,
						source: [],
						inputOverride: { main: [[{ json: { original: true } }]] },
					},
				],
			},
		},
	});
	data.parentAgentRun = {
		agentId: 'agent',
		projectId: 'project',
		threadId: 'thread',
		runId: 'run',
		toolCallId: 'call',
	};
	const now = new Date();
	const execution: IExecutionResponse = {
		id: '1',
		status: 'waiting',
		waitTill: WAIT_INDEFINITELY,
		data,
		mode: 'manual',
		createdAt: now,
		startedAt: now,
		workflowId: 'workflow',
		finished: false,
		storedAt: 'db',
		customData: {},
		annotation: { tags: [] },
		workflowData: {
			id: 'workflow',
			name: 'Review',
			active: false,
			activeVersionId: null,
			isArchived: false,
			createdAt: now,
			updatedAt: now,
			nodes: [],
			connections: {},
		},
	};
	executions.findSingleExecution.mockImplementation(async () => ({
		...execution,
		data: structuredClone(data),
	}));
	executions.updateExistingExecution.mockResolvedValue(true);
	return {
		tracker: new ResponseWaitTracker(executions, core, logger),
		execution,
		executions,
		core,
		logger,
	};
}
const response = { nodeId: 'node', data: [{ json: { approved: true } }] };

describe('ResponseWaitTracker', () => {
	it('saves the response before delegating to the core tracker and retains the original input', async () => {
		const { tracker, executions, core } = setup();
		await tracker.respond('1', response);
		const [, saved, conditions] = executions.updateExistingExecution.mock.calls[0];
		expect(conditions).toEqual({ requireStatus: 'waiting', requireWaitTill: WAIT_INDEFINITELY });
		expect(saved.waitTill?.getTime()).toBeLessThanOrEqual(Date.now());
		expect(saved.data?.waitTill).toBeUndefined();
		const entry = saved.data?.executionData?.nodeExecutionStack[0];
		expect(entry?.node.disabled).toBe(true);
		expect(entry?.data.main).toEqual([response.data]);
		expect(saved.data?.resultData.runData.Review[0].inputOverride).toEqual({
			main: [[{ json: { original: true } }]],
		});
		expect(saved.data?.parentAgentRun?.runId).toBe('run');
		expect(core.startExecution).toHaveBeenCalledExactlyOnceWith('1');
		expect(executions.updateExistingExecution.mock.invocationCallOrder[0]).toBeLessThan(
			core.startExecution.mock.invocationCallOrder[0],
		);
	});

	it('does not restart when another response or cancellation wins the guarded save', async () => {
		const { tracker, executions, core } = setup();
		executions.updateExistingExecution.mockResolvedValue(false);
		await expect(tracker.respond('1', response)).rejects.toBeInstanceOf(
			ExecutionAlreadyResumingError,
		);
		expect(core.startExecution).not.toHaveBeenCalled();
	});

	it('accepts only one of two concurrent responses', async () => {
		const { tracker, executions, core } = setup();
		executions.updateExistingExecution.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const results = await Promise.allSettled([
			tracker.respond('1', response),
			tracker.respond('1', { ...response, data: [{ json: { approved: false } }] }),
		]);
		expect(results.map(({ status }) => status)).toEqual(['fulfilled', 'rejected']);
		expect(core.startExecution).toHaveBeenCalledOnce();
	});

	it('keeps a durable wake-up when immediate resume fails', async () => {
		const { tracker, executions, core, logger } = setup();
		core.startExecution.mockRejectedValue(new OperationalError('Unavailable'));
		await expect(tracker.respond('1', response)).resolves.toBe(true);
		expect(executions.updateExistingExecution.mock.calls[0][1].waitTill).toBeInstanceOf(Date);
		expect(logger.warn).toHaveBeenCalledOnce();
	});

	it('reports a resume that the resume-attempt limit refuses', async () => {
		const { tracker, core } = setup();
		core.startExecution.mockResolvedValue(false);
		await expect(tracker.respond('1', response)).resolves.toBe(false);
	});

	it('reports a granted resume', async () => {
		const { tracker, core } = setup();
		core.startExecution.mockResolvedValue(true);
		await expect(tracker.respond('1', response)).resolves.toBe(true);
	});

	it('accepts a response when the core poll already started the saved continuation', async () => {
		const { tracker, core, logger } = setup();
		core.startExecution.mockRejectedValue(new ExecutionAlreadyResumingError('1'));
		await expect(tracker.respond('1', response)).resolves.toBe(true);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it.each([
		'missing',
		'running',
		'node',
		'disabled',
		'boundary',
		'timed',
		'completed-response',
		'run-data',
	] as const)('rejects an unavailable wait: %s', async (state) => {
		const { tracker, execution, executions, core } = setup();
		const entry = execution.data.executionData!.nodeExecutionStack[0];
		if (state === 'missing') executions.findSingleExecution.mockResolvedValue(undefined);
		if (state === 'running') execution.status = 'running';
		if (state === 'node') entry.node.id = 'other';
		if (state === 'disabled') entry.node.disabled = true;
		if (state === 'boundary') execution.data.waitReason = 'suspended';
		if (state === 'timed') execution.waitTill = new Date(Date.now() + 10000);
		if (state === 'completed-response') execution.waitTill = new Date();
		if (state === 'run-data') execution.data.resultData.runData = {};
		await expect(tracker.respond('1', response)).rejects.toThrow();
		expect(executions.updateExistingExecution).not.toHaveBeenCalled();
		expect(core.startExecution).not.toHaveBeenCalled();
	});
});
