import type { Logger } from '@n8n/backend-common';
import type { INode, INodeExecutionData, Workflow } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Tracing } from '@/observability';

import type { PollContext } from '../node-execution-context';
import { PollTriggerExecutor } from '../poll-trigger-executor';
import type { TriggersAndPollers } from '../triggers-and-pollers';

describe('PollTriggerExecutor', () => {
	const tracing = new Tracing();

	LoggerProxy.init(mock());
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const triggersAndPollers = mock<TriggersAndPollers>();
	const node = mock<INode>({ id: 'poll-node', name: 'Poll Node' });
	const pollFunctions = mock<PollContext>();

	let executor: PollTriggerExecutor;
	let workflow: Workflow;
	let acquireIsolate: Mock;
	let releaseIsolate: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		acquireIsolate = vi.fn().mockResolvedValue(undefined);
		releaseIsolate = vi.fn().mockResolvedValue(undefined);
		workflow = mock<Workflow>({ id: 'wf-id', name: 'My Workflow' });
		// @ts-expect-error -- minimal expression stub for isolate-acquisition tests
		workflow.expression = { acquireIsolate, releaseIsolate };
		executor = new PollTriggerExecutor(logger, triggersAndPollers, tracing);
	});

	it('uses a logger scoped to "poll-trigger"', () => {
		expect(logger.scoped).toHaveBeenCalledWith('poll-trigger');
	});

	describe('initial activation poll (testingTrigger=true)', () => {
		it('emits the poll result without acquiring the isolate', async () => {
			const result: INodeExecutionData[][] = [[{ json: { ok: true } }]];
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(result);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute(true);

			expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
				workflow,
				node,
				pollFunctions,
			);
			expect(pollFunctions.__emit).toHaveBeenCalledWith(result);
			// The initial poll runs inside the outer isolate window, so it must not acquire its own.
			expect(acquireIsolate).not.toHaveBeenCalled();
			expect(releaseIsolate).not.toHaveBeenCalled();
		});

		it('does not emit when the poll returns null', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute(true);

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
		});

		it('rethrows the poll error so activation fails', async () => {
			const error = new Error('poll failed');
			triggersAndPollers.runPollFunction.mockRejectedValueOnce(error);

			const execute = executor.create(workflow, node, pollFunctions, () => true);

			await expect(execute(true)).rejects.toThrow(error);
			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
		});
	});

	describe('scheduled poll (testingTrigger=false)', () => {
		it('acquires and releases the isolate and emits the result', async () => {
			const result: INodeExecutionData[][] = [[{ json: { ok: true } }]];
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(result);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(acquireIsolate).toHaveBeenCalledTimes(1);
			expect(pollFunctions.__emit).toHaveBeenCalledWith(result);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('emits an error when the poll fails for a current workflow', async () => {
			const error = new Error('poll failed');
			triggersAndPollers.runPollFunction.mockRejectedValueOnce(error);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('skips the poll entirely when superseded before running', async () => {
			const execute = executor.create(workflow, node, pollFunctions, () => false);
			await execute();

			expect(triggersAndPollers.runPollFunction).not.toHaveBeenCalled();
			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(acquireIsolate).not.toHaveBeenCalled();
		});

		it('drops an in-flight result when superseded after the poll resolves', async () => {
			let isCurrent = true;
			triggersAndPollers.runPollFunction.mockImplementationOnce(async () => {
				// The workflow is removed/reactivated while the poll is in flight.
				isCurrent = false;
				return [[{ json: { stale: true } }]];
			});

			const execute = executor.create(workflow, node, pollFunctions, () => isCurrent);
			await execute();

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			// The dropped poll still releases the isolate it acquired.
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('ignores a poll error when superseded', async () => {
			let isCurrent = true;
			triggersAndPollers.runPollFunction.mockImplementationOnce(async () => {
				isCurrent = false;
				throw new Error('poll failed');
			});

			const execute = executor.create(workflow, node, pollFunctions, () => isCurrent);
			await execute();

			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});
	});
});
