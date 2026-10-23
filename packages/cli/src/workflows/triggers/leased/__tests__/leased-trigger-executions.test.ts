import type { Logger } from '@n8n/backend-common';
import type { OperationContext, Project, TransactionRunner } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { ErrorReporter } from 'n8n-core';
import type {
	IExecuteResponsePromiseData,
	IWorkflowBase,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { WorkflowOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import type { ExecutionCrashService } from '@/executions/execution-crash.service';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { OwnershipService } from '@/services/ownership.service';
import type { WorkflowRunner } from '@/workflow-runner';
import type { EngineV2ActiveTriggers } from '@/workflows/triggers/engine-v2-active-triggers';
import type { WorkflowExecutionService } from '@/workflows/workflow-execution.service';

import { node } from '../../__tests__/trigger-test-utils';
import { LeasedTriggerExecutions } from '../leased-trigger-executions';

const trigger = node('kafka', 'trigger');
const workflowData = mock<IWorkflowBase>({ id: 'wf-1', name: 'Orders' });
const ctx: OperationContext = { trx: mock() };

const setup = ({ held = true, engineV2 = false } = {}) => {
	const transactionRunner = mock<TransactionRunner>();
	transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
	const executionPersistence = mock<ExecutionPersistence>();
	executionPersistence.create.mockResolvedValue('exec-1');
	const executionCrashService = mock<ExecutionCrashService>();
	const workflowRunner = mock<WorkflowRunner>();
	workflowRunner.establishContextForPersistence.mockResolvedValue(undefined);
	const workflowExecutionService = mock<WorkflowExecutionService>();
	workflowExecutionService.runWorkflow.mockResolvedValue('exec-v2');
	const ownershipService = mock<OwnershipService>();
	ownershipService.getWorkflowProjectCached.mockResolvedValue(
		mock<Project>({ id: 'project-1', name: 'Project' }),
	);
	const engineV2ActiveTriggers = mock<EngineV2ActiveTriggers>();
	engineV2ActiveTriggers.handles.mockReturnValue(engineV2);
	const logger = mock<Logger>({ scoped: () => mock<Logger>() });

	const executions = new LeasedTriggerExecutions(
		logger,
		mock<ErrorReporter>(),
		transactionRunner,
		executionPersistence,
		executionCrashService,
		workflowRunner,
		workflowExecutionService,
		ownershipService,
		engineV2ActiveTriggers,
	);
	const isHeld = vi.fn(async (_ctx: OperationContext) => held);
	const onLeaseLost = vi.fn();
	const responsePromise = createDeferredPromise<IExecuteResponsePromiseData>();
	const run = async () =>
		await executions.run(
			{ fence: { isHeld }, onLeaseLost },
			workflowData,
			trigger,
			[[{ json: { offset: 1 } }]],
			mock<IWorkflowExecuteAdditionalData>({ userId: 'user-1' }),
			'trigger',
			responsePromise,
			'dedup-1',
		);
	return {
		run,
		isHeld,
		onLeaseLost,
		responsePromise,
		executionPersistence,
		executionCrashService,
		workflowRunner,
		workflowExecutionService,
	};
};

describe('LeasedTriggerExecutions', () => {
	it('inserts the execution in the transaction that checks the lease, then starts it', async () => {
		const { run, isHeld, onLeaseLost, executionPersistence, workflowRunner } = setup();

		await expect(run()).resolves.toBe('exec-1');

		expect(isHeld).toHaveBeenCalledWith(ctx);
		expect(executionPersistence.create).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'new',
				workflowId: 'wf-1',
				mode: 'trigger',
				deduplicationKey: 'dedup-1',
			}),
			ctx,
		);
		expect(workflowRunner.run).toHaveBeenCalledWith(
			expect.objectContaining({ executionMode: 'trigger', userId: 'user-1' }),
			false,
			undefined,
			{ executionId: 'exec-1', expectedStatus: 'new' },
			expect.anything(),
		);
		expect(onLeaseLost).not.toHaveBeenCalled();
	});

	it('creates and runs no execution when the lease is lost, and reports the loss', async () => {
		const { run, onLeaseLost, responsePromise, executionPersistence, workflowRunner } = setup({
			held: false,
		});

		await expect(run()).resolves.toBeUndefined();
		await expect(responsePromise.promise).rejects.toThrow('the lease is lost');

		expect(executionPersistence.create).not.toHaveBeenCalled();
		expect(workflowRunner.run).not.toHaveBeenCalled();
		expect(onLeaseLost).toHaveBeenCalledOnce();
	});

	it('marks an inserted execution as crashed when it fails to start', async () => {
		const { run, workflowRunner, executionCrashService, responsePromise } = setup();
		workflowRunner.run.mockRejectedValue(new Error('queue down'));

		await expect(run()).resolves.toBe('exec-1');
		await expect(responsePromise.promise).rejects.toThrow('queue down');

		expect(executionCrashService.markAsCrashed).toHaveBeenCalledWith('exec-1', 'start-failure');
	});

	it('leaves an execution another starter already claimed alone', async () => {
		const { run, workflowRunner, executionCrashService } = setup();
		workflowRunner.run.mockRejectedValue(new ExecutionAlreadyResumingError('exec-1'));

		await expect(run()).resolves.toBe('exec-1');

		expect(executionCrashService.markAsCrashed).not.toHaveBeenCalled();
	});

	it('inserts nothing when the execution context cannot be prepared', async () => {
		const { run, workflowRunner, executionPersistence, isHeld, responsePromise } = setup();
		workflowRunner.establishContextForPersistence.mockResolvedValue(
			new WorkflowOperationError('masking failed'),
		);

		await expect(run()).resolves.toBeUndefined();
		await expect(responsePromise.promise).rejects.toThrow('masking failed');

		expect(isHeld).not.toHaveBeenCalled();
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it('starts an engine v2 run only after the lease check passes', async () => {
		const { run, isHeld, workflowExecutionService, executionPersistence } = setup({
			engineV2: true,
		});

		await expect(run()).resolves.toBe('exec-v2');

		expect(isHeld).toHaveBeenCalledWith(ctx);
		expect(workflowExecutionService.runWorkflow).toHaveBeenCalledWith(
			workflowData,
			trigger,
			[[{ json: { offset: 1 } }]],
			expect.anything(),
			'trigger',
			expect.anything(),
			'dedup-1',
			'none',
		);
		expect(executionPersistence.create).not.toHaveBeenCalled();
	});

	it('starts no engine v2 run when the lease is lost', async () => {
		const { run, onLeaseLost, workflowExecutionService, responsePromise } = setup({
			held: false,
			engineV2: true,
		});

		await expect(run()).resolves.toBeUndefined();
		await expect(responsePromise.promise).rejects.toThrow('the lease is lost');

		expect(workflowExecutionService.runWorkflow).not.toHaveBeenCalled();
		expect(onLeaseLost).toHaveBeenCalledOnce();
	});
});
