import type { Logger } from '@n8n/backend-common';
import type { INode, INodeExecutionData, IPollFunctions, Workflow } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ErrorReporter } from '@/errors/error-reporter';
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
	const errorReporter = mock<ErrorReporter>();
	const node = mock<INode>({ id: 'poll-node', name: 'Poll Node' });
	const pollFunctions = mock<PollContext>();

	let executor: PollTriggerExecutor;
	let workflow: Workflow;
	let acquireIsolate: Mock;
	let releaseIsolate: Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		pollFunctions.__runPoll.mockImplementation(async (poll) => await poll());
		acquireIsolate = vi.fn().mockResolvedValue(undefined);
		releaseIsolate = vi.fn().mockResolvedValue(undefined);
		workflow = mock<Workflow>({ id: 'wf-id', name: 'My Workflow' });
		// @ts-expect-error -- minimal expression stub for isolate-acquisition tests
		workflow.expression = { acquireIsolate, releaseIsolate };
		executor = new PollTriggerExecutor(logger, triggersAndPollers, tracing, errorReporter);
	});

	it('uses a logger scoped to "poll-trigger"', () => {
		expect(logger.scoped).toHaveBeenCalledWith('poll-trigger');
	});

	describe('tracing', () => {
		it('starts its own root trace for a scheduled poll', async () => {
			const startNewTraceSpan = vi.spyOn(tracing, 'startNewTraceSpan');
			const startSpan = vi.spyOn(tracing, 'startSpan');
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(startNewTraceSpan).toHaveBeenCalledTimes(1);
			expect(startSpan).not.toHaveBeenCalled();
		});

		it('nests the activation poll in the current trace', async () => {
			const startNewTraceSpan = vi.spyOn(tracing, 'startNewTraceSpan');
			const startSpan = vi.spyOn(tracing, 'startSpan');
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute(true);

			expect(startSpan).toHaveBeenCalledTimes(1);
			expect(startNewTraceSpan).not.toHaveBeenCalled();
		});
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

		it('does not emit and still releases the isolate when the poll returns nothing', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(pollFunctions.__emit).not.toHaveBeenCalled();
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('logs a failing cursor commit instead of routing it to the error workflow', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);
			const commitError = new Error('poller state write failed');
			pollFunctions.__commitCursor.mockRejectedValueOnce(commitError);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(pollFunctions.__emitError).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to commit the poll cursor'),
				expect.objectContaining({ workflowId: 'wf-id', nodeId: 'poll-node', error: commitError }),
			);
			expect(errorReporter.error).toHaveBeenCalledWith(
				commitError,
				expect.objectContaining({ extra: { workflowId: 'wf-id', nodeId: 'poll-node' } }),
			);
			expect(releaseIsolate).toHaveBeenCalledTimes(1);
		});

		it('routes a cursor resolution failure through __emitError instead of rejecting', async () => {
			const error = new Error('could not resolve poll cursor');
			pollFunctions.__runPoll.mockRejectedValueOnce(error);

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await expect(execute()).resolves.toBeUndefined();

			expect(pollFunctions.__emitError).toHaveBeenCalledWith(error);
			expect(acquireIsolate).not.toHaveBeenCalled();
			expect(releaseIsolate).not.toHaveBeenCalled();
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

	describe('cursor commit', () => {
		const items: INodeExecutionData[][] = [[{ json: { ok: true } }]];

		// `supersede` stands in for the workflow being removed or reactivated while
		// the poll is in flight.
		const cases: Array<
			[
				string,
				{
					testingTrigger: boolean;
					poll: (supersede: () => void) => Promise<INodeExecutionData[][] | null>;
					commits: number;
				},
			]
		> = [
			[
				'commits on its own for an empty scheduled poll',
				{ testingTrigger: false, poll: async () => null, commits: 1 },
			],
			[
				'leaves the commit to the emit path when the scheduled poll returns data',
				{ testingTrigger: false, poll: async () => items, commits: 0 },
			],
			[
				'commits nothing when the scheduled poll throws',
				{
					testingTrigger: false,
					poll: async () => {
						throw new Error('poll failed');
					},
					commits: 0,
				},
			],
			[
				'commits nothing when an empty scheduled poll is superseded while in flight',
				{
					testingTrigger: false,
					poll: async (supersede) => {
						supersede();
						return null;
					},
					commits: 0,
				},
			],
			[
				'commits nothing for an empty activation poll',
				{ testingTrigger: true, poll: async () => null, commits: 0 },
			],
		];

		it.each(cases)('%s', async (_name, { testingTrigger, poll, commits }) => {
			let isCurrent = true;
			triggersAndPollers.runPollFunction.mockImplementationOnce(
				async () =>
					await poll(() => {
						isCurrent = false;
					}),
			);

			const execute = executor.create(workflow, node, pollFunctions, () => isCurrent);
			await execute(testingTrigger);

			expect(pollFunctions.__commitCursor).toHaveBeenCalledTimes(commits);
		});
	});

	describe('staged cursor scope', () => {
		// Stands in for the factory's staging store: a cursor can only be committed
		// from inside the scope its own poll opened.
		const scope = new AsyncLocalStorage<string>();

		beforeEach(() => {
			pollFunctions.__runPoll.mockImplementation(async (poll) => await scope.run('staging', poll));
		});

		it('commits the cursor inside the scope __runPoll opened', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);
			let scopeAtCommit: string | undefined;
			pollFunctions.__commitCursor.mockImplementationOnce(async () => {
				scopeAtCommit = scope.getStore();
			});

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(scopeAtCommit).toBe('staging');
		});

		it('emits inside the scope __runPoll opened', async () => {
			triggersAndPollers.runPollFunction.mockResolvedValueOnce([[{ json: { ok: true } }]]);
			let scopeAtEmit: string | undefined;
			pollFunctions.__emit.mockImplementationOnce(() => {
				scopeAtEmit = scope.getStore();
			});

			const execute = executor.create(workflow, node, pollFunctions, () => true);
			await execute();

			expect(scopeAtEmit).toBe('staging');
		});
	});

	describe('poll functions missing the durable-cursor members', () => {
		it('still runs the poll when __runPoll and __commitCursor are undefined', async () => {
			const bareWorkflow = mock<Workflow>({ id: 'wf-id', name: 'My Workflow' });
			// @ts-expect-error -- minimal expression stub for isolate-acquisition tests
			bareWorkflow.expression = { acquireIsolate, releaseIsolate };
			const barePollFunctions = mock<IPollFunctions>({
				__runPoll: undefined,
				__commitCursor: undefined,
			});
			triggersAndPollers.runPollFunction.mockResolvedValueOnce(null);

			const execute = executor.create(bareWorkflow, node, barePollFunctions, () => true);
			await execute();

			expect(triggersAndPollers.runPollFunction).toHaveBeenCalledWith(
				bareWorkflow,
				node,
				barePollFunctions,
			);
			expect(logger.error).not.toHaveBeenCalled();
		});
	});
});
