import type { ExecutionLedger } from '@n8n/backend-services';
import type { WorkflowExecuteAfterContext } from '@n8n/decorators';
import { createRunExecutionData } from 'n8n-workflow';
import type { ExecutionStatus, IRun, IWorkflowBase, WorkflowExecuteMode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionEndedHandler } from '../execution-ended.handler';

const startedAt = new Date('2026-01-01T00:00:00.000Z');
const stoppedAt = new Date('2026-01-01T00:00:02.500Z');

function createContext(
	overrides: {
		mode?: WorkflowExecuteMode;
		status?: ExecutionStatus;
		workflowId?: string;
		executedInThisProcess?: boolean;
		endedByThisSave?: boolean;
		source?: WorkflowExecuteAfterContext['source'];
	} = {},
): WorkflowExecuteAfterContext {
	const mode = overrides.mode ?? 'trigger';
	const workflow: IWorkflowBase = {
		id: overrides.workflowId ?? 'wf-1',
		name: 'My workflow',
		active: false,
		activeVersionId: null,
		isArchived: false,
		createdAt: startedAt,
		updatedAt: startedAt,
		nodes: [],
		connections: {},
	};
	const runData: IRun = {
		data: createRunExecutionData(),
		mode,
		startedAt,
		stoppedAt,
		storedAt: 'db',
		status: overrides.status ?? 'success',
	};

	return {
		type: 'workflowExecuteAfter',
		workflow,
		mode,
		runData,
		newStaticData: {},
		executionId: 'exec-1',
		executedInThisProcess: overrides.executedInThisProcess ?? true,
		endedByThisSave: overrides.endedByThisSave ?? true,
		source: overrides.source,
	};
}

describe('ExecutionEndedHandler', () => {
	let ledger: ReturnType<typeof mock<ExecutionLedger>>;
	let handler: ExecutionEndedHandler;

	beforeEach(() => {
		ledger = mock<ExecutionLedger>();
		ledger.recordEnded.mockResolvedValue();
		handler = new ExecutionEndedHandler(ledger);
	});

	it('records the ended facts once when this process ended a successful run', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ source: 'instance_ai' }));

		expect(ledger.recordEnded).toHaveBeenCalledTimes(1);
		expect(ledger.recordEnded).toHaveBeenCalledWith(
			expect.objectContaining({
				executionId: 'exec-1',
				workflowId: 'wf-1',
				outcome: 'success',
				runtimeMs: 2500,
				mode: 'trigger',
				source: 'instance_ai',
				occurredAt: stoppedAt,
			}),
		);
	});

	it('records a failed run with its outcome', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ status: 'error' }));

		expect(ledger.recordEnded).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'error' }));
	});

	it('records nothing when the run was not executed in this process', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ executedInThisProcess: false }));

		expect(ledger.recordEnded).not.toHaveBeenCalled();
	});

	it('records nothing when this save did not end the run', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ endedByThisSave: false }));

		expect(ledger.recordEnded).not.toHaveBeenCalled();
	});

	it('records nothing for a canceled run', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ status: 'canceled' }));

		expect(ledger.recordEnded).not.toHaveBeenCalled();
	});

	it('records nothing for a run that has not finished', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ status: 'running' }));

		expect(ledger.recordEnded).not.toHaveBeenCalled();
	});

	it('records nothing when the workflow has no id', async () => {
		await handler.handleWorkflowExecuteAfter(createContext({ workflowId: '' }));

		expect(ledger.recordEnded).not.toHaveBeenCalled();
	});

	describe('waiting for the write', () => {
		function deferred() {
			let resolve!: () => void;
			const promise = new Promise<void>((r) => {
				resolve = r;
			});
			return { promise, resolve };
		}

		async function flushMicrotasks() {
			for (let i = 0; i < 5; i++) await Promise.resolve();
		}

		it('waits for the write when the mode is cli', async () => {
			const write = deferred();
			ledger.recordEnded.mockReturnValue(write.promise);
			let settled = false;

			const handling = handler
				.handleWorkflowExecuteAfter(createContext({ mode: 'cli' }))
				.then(() => {
					settled = true;
				});
			await flushMicrotasks();

			expect(ledger.recordEnded).toHaveBeenCalledTimes(1);
			expect(settled).toBe(false);

			write.resolve();
			await handling;

			expect(settled).toBe(true);
		});

		it('does not wait for the write when the mode is not cli', async () => {
			const write = deferred();
			ledger.recordEnded.mockReturnValue(write.promise);
			let settled = false;

			const handling = handler
				.handleWorkflowExecuteAfter(createContext({ mode: 'trigger' }))
				.then(() => {
					settled = true;
				});
			await flushMicrotasks();

			expect(ledger.recordEnded).toHaveBeenCalledTimes(1);
			expect(settled).toBe(true);

			write.resolve();
			await handling;
		});
	});
});
