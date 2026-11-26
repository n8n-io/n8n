import { describe, expect, it, vi } from 'vitest';

import type { ErrorWorkflowResolver, ErrorWorkflowStart } from '../../dependencies';
import { GraphValidationError } from '../../graph';
import type { EngineLogger } from '../../logging';
import { ErrorWorkflowStarter } from '../error-workflow-starter';
import type { ErrorWorkflowState, ExecutionRecord, ExecutionStore } from '../execution-store';
import type { StartExecutionService } from '../start-execution.service';
import type { StepRecord, StepStore } from '../step-store';

const workflow = { id: 'wf-failed', name: 'Failed', nodes: [], connections: {}, settings: {} };

const failedExecution: ExecutionRecord = {
	id: 'failed-exec',
	workflowId: 'wf-failed',
	status: 'failed',
	mode: 'manual',
	graph: {
		nodes: [
			{ id: 'trigger', name: 'Trigger', type: 'trigger' },
			{ id: 'http', name: 'HTTP Request', type: 'v1-node' },
		],
		edges: [{ from: 'trigger', to: 'http', outputIndex: 0, inputIndex: 0 }],
		seeded: [],
	},
	workflow: {},
	triggerOutputs: null,
	callerContext: { hostMode: 'integrated', projectId: 'project-of-parent' },
	responseExpectation: { kind: 'none' },
	parent: { executionId: 'parent-exec', stepId: 'parent-step', awaited: true },
	finishedAt: new Date('2026-11-23T10:00:00.000Z'),
};

const failedStep = {
	id: 'step-http',
	executionId: 'failed-exec',
	nodeId: 'http',
	iteration: 0,
	status: 'failed',
	outputs: null,
	outputSources: null,
	waitDeclaration: null,
	resumeCause: null,
	error: {
		name: 'NodeApiError',
		message: 'The service refused the request',
		stack: 'NodeApiError: The service refused the request\n    at HttpRequest.execute',
		details: { httpCode: '403' },
	},
} satisfies StepRecord;

const start: ErrorWorkflowStart = {
	kind: 'start',
	executionId: 'error-exec',
	workflowId: 'wf-error',
	graph: { nodes: [{ id: 'error-trigger', name: 'Error Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'wf-error' },
	triggerOutputs: [[{ json: { execution: { id: 'failed-exec' } } }]],
	callerContext: { hostMode: 'error', projectId: 'project-of-failed' },
	resolveErrorWorkflowOnFailure: false,
};

function setup({
	state = {},
	execution = failedExecution,
	failedSteps = [failedStep],
	resolve = vi.fn<ErrorWorkflowResolver>().mockResolvedValue(start),
}: {
	state?: Partial<ErrorWorkflowState>;
	execution?: ExecutionRecord;
	/** The failed steps by settle time. */
	failedSteps?: StepRecord[];
	/** `null` builds a starter without a resolver. */
	resolve?: ErrorWorkflowResolver | null;
} = {}) {
	const executionStore = {
		loadErrorWorkflowState: vi.fn().mockResolvedValue({
			dueAt: new Date('2026-11-23T10:01:00.000Z'),
			hasErrorExecution: false,
			workflow,
			...state,
		}),
		loadExecution: vi.fn().mockResolvedValue(execution),
		clearErrorWorkflowDue: vi.fn(),
	} as unknown as ExecutionStore;
	const stepStore = {
		loadFailedSteps: vi.fn().mockResolvedValue(failedSteps),
	} as unknown as StepStore;
	const startExecution = {
		start: vi.fn().mockResolvedValue({ executionId: 'error-exec' }),
	} as unknown as StartExecutionService;
	const logger: EngineLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
	const starter = new ErrorWorkflowStarter(
		executionStore,
		stepStore,
		startExecution,
		logger,
		resolve ?? undefined,
	);
	return { starter, executionStore, startExecution, logger, resolve };
}

describe('ErrorWorkflowStarter', () => {
	it('does nothing when no error execution is due', async () => {
		const { starter, resolve, executionStore } = setup({ state: { dueAt: null } });

		expect(await starter.start('failed-exec')).toBe('not-due');

		expect(resolve).not.toHaveBeenCalled();
		expect(executionStore.clearErrorWorkflowDue).not.toHaveBeenCalled();
	});

	it('only clears the marker when the execution already has an error execution', async () => {
		const { starter, resolve, executionStore } = setup({ state: { hasErrorExecution: true } });

		expect(await starter.start('failed-exec')).toBe('started');

		expect(resolve).not.toHaveBeenCalled();
		expect(executionStore.clearErrorWorkflowDue).toHaveBeenCalledWith('failed-exec');
	});

	it('clears the marker when the host supplies no resolver', async () => {
		const { starter, executionStore, startExecution } = setup({ resolve: null });

		expect(await starter.start('failed-exec')).toBe('abandoned');

		expect(executionStore.clearErrorWorkflowDue).toHaveBeenCalledWith('failed-exec');
		expect(startExecution.start).not.toHaveBeenCalled();
	});

	it('sends the stored document, the first failed step and the parent link state to the resolver', async () => {
		const { starter, resolve } = setup();

		await starter.start('failed-exec');

		expect(resolve).toHaveBeenCalledWith({
			executionId: 'failed-exec',
			workflowId: 'wf-failed',
			workflow,
			hostMode: 'integrated',
			hasParent: true,
			failedStep: {
				nodeName: 'HTTP Request',
				error: {
					name: 'NodeApiError',
					message: 'The service refused the request',
					details: { httpCode: '403' },
				},
			},
		});
	});

	it('sends the failed step that settled first, without its stack', async () => {
		const laterStep = {
			...failedStep,
			id: 'step-trigger',
			nodeId: 'trigger',
			error: { name: 'Error', message: 'later' },
		};
		const { starter, resolve } = setup({ failedSteps: [failedStep, laterStep] });

		await starter.start('failed-exec');

		expect(resolve).toHaveBeenCalledWith(
			expect.objectContaining({
				failedStep: {
					nodeName: 'HTTP Request',
					error: expect.not.objectContaining({ stack: expect.anything() }),
				},
			}),
		);
	});

	it('sends no failed step when the execution failed without one', async () => {
		const { starter, resolve } = setup({
			execution: { ...failedExecution, parent: null },
			failedSteps: [],
		});

		await starter.start('failed-exec');

		expect(resolve).toHaveBeenCalledWith(
			expect.not.objectContaining({ failedStep: expect.anything() }),
		);
		expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ hasParent: false }));
	});

	it('starts the error execution in production mode, with the link and the context the host returned', async () => {
		const { starter, startExecution, executionStore } = setup();

		expect(await starter.start('failed-exec')).toBe('started');

		expect(startExecution.start).toHaveBeenCalledWith({
			executionId: 'error-exec',
			workflowId: 'wf-error',
			graph: start.graph,
			workflow: start.workflow,
			triggerOutputs: start.triggerOutputs,
			mode: 'production',
			callerContext: { hostMode: 'error', projectId: 'project-of-failed' },
			errorSource: { executionId: 'failed-exec', workflowId: 'wf-failed' },
			resolveErrorWorkflowOnFailure: false,
		});
		// The start clears the marker in its own transaction.
		expect(executionStore.clearErrorWorkflowDue).not.toHaveBeenCalled();
	});

	it('clears the marker when the host answers none, and starts nothing', async () => {
		const { starter, startExecution, executionStore } = setup({
			resolve: vi
				.fn<ErrorWorkflowResolver>()
				.mockResolvedValue({ kind: 'none', reason: 'no error workflow' }),
		});

		expect(await starter.start('failed-exec')).toBe('abandoned');

		expect(executionStore.clearErrorWorkflowDue).toHaveBeenCalledWith('failed-exec');
		expect(startExecution.start).not.toHaveBeenCalled();
	});

	it('leaves the marker when the resolver fails, so the repair tries again', async () => {
		const { starter, executionStore } = setup({
			resolve: vi.fn<ErrorWorkflowResolver>().mockRejectedValue(new Error('control plane down')),
		});

		await expect(starter.start('failed-exec')).rejects.toThrow('control plane down');

		expect(executionStore.clearErrorWorkflowDue).not.toHaveBeenCalled();
	});

	it('clears the marker when the engine refuses the resolved graph, since a retry cannot help', async () => {
		const { starter, startExecution, executionStore, logger } = setup();
		vi.mocked(startExecution.start).mockRejectedValue(new GraphValidationError('no trigger'));

		expect(await starter.start('failed-exec')).toBe('abandoned');

		expect(executionStore.clearErrorWorkflowDue).toHaveBeenCalledWith('failed-exec');
		expect(logger.error).toHaveBeenCalled();
	});

	it('leaves the marker when the start fails for another reason', async () => {
		const { starter, startExecution, executionStore } = setup();
		vi.mocked(startExecution.start).mockRejectedValue(new Error('database down'));

		await expect(starter.start('failed-exec')).rejects.toThrow('database down');

		expect(executionStore.clearErrorWorkflowDue).not.toHaveBeenCalled();
	});

	it.each(['completed', 'cancelled'] as const)(
		'refuses an execution that is %s',
		async (status) => {
			const { starter } = setup({ execution: { ...failedExecution, status } });

			await expect(starter.start('failed-exec')).rejects.toThrow('no error workflow can be due');
		},
	);

	it('logs a failed try after the end, and does not throw', async () => {
		const { starter, logger } = setup({
			resolve: vi.fn<ErrorWorkflowResolver>().mockRejectedValue(new Error('control plane down')),
		});

		await expect(starter.startAfterFailure('failed-exec')).resolves.toBeUndefined();

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('reconciliation sweep tries again'),
			expect.objectContaining({ executionId: 'failed-exec' }),
		);
	});
});
