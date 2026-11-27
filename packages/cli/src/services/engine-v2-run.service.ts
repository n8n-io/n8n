import { Time } from '@n8n/constants';
import { Container, Service } from '@n8n/di';
import type { LifecycleEvent } from '@n8n/engine';
import { OperationalError, UnexpectedError } from '@n8n/errors';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { withTimeout } from '@n8n/utils/promise/with-timeout';
import type { IWorkflowExecutionDataProcess, TerminalExecutionStatus } from 'n8n-workflow';

import { createExecutionIdV2, type ExecutionIdV2 } from '@/executions/execution-id';
import {
	EngineDataPlaneProxyService,
	EngineV2UnavailableError,
} from '@/services/engine-data-plane-proxy.service';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { WorkflowRunner } from '@/workflow-runner';

const MAX_TIMEOUT_MS = Time.days.toMilliseconds;

/** The data plane client sets no request timeout of its own. */
const CANCEL_TIMEOUT_MS = 5_000;

export type EngineV2RunOutcome =
	| { kind: 'finished'; status: TerminalExecutionStatus }
	| { kind: 'timeout' }
	| { kind: 'aborted' };

/** `timeoutMs` is required, because the end event can be lost. */
export type EngineV2RunWaitOptions = { timeoutMs: number; abortSignal?: AbortSignal };

const FINISHED_STATUS: Partial<Record<LifecycleEvent['type'], TerminalExecutionStatus>> = {
	'execution:completed': 'success',
	'execution:failed': 'error',
	'execution:cancelled': 'canceled',
};

/**
 * Starts engine v2 runs for control-plane code that waits for their end.
 * It is not part of {@link EngineV2Dispatcher}, because `WorkflowRunner`
 * depends on the dispatcher.
 */
@Service()
export class EngineV2RunService {
	constructor(
		private readonly runner: WorkflowRunner,
		private readonly dispatcher: EngineV2Dispatcher,
		private readonly proxy: EngineDataPlaneProxyService,
	) {}

	routesToEngineV2(data: IWorkflowExecutionDataProcess): boolean {
		return this.dispatcher.routesToEngineV2(data);
	}

	/**
	 * Starts an engine v2 run and waits until it ends, the time runs out, or the
	 * signal aborts. The time counts from the moment the run has started.
	 *
	 * It cancels the run only when the start
	 * fails, because the data plane can save the run before the start fails. On
	 * `timeout` or `aborted`, the caller decides what to do with the run. Events
	 * can be lost, so after a `timeout` the caller reads the status from the data
	 * plane.
	 *
	 * @throws {UnexpectedError} If the run does not go to engine v2, if
	 * `timeoutMs` is more than 24 hours, or if the run starts under another id.
	 * @throws {EngineV2UnavailableError} If the `engine-v2` module is not enabled.
	 * @throws {OperationalError} If it cannot subscribe to the lifecycle events.
	 * @throws The errors of `WorkflowRunner.run` when the run does not start.
	 */
	async runAndWait(
		data: IWorkflowExecutionDataProcess,
		options: EngineV2RunWaitOptions,
	): Promise<{ executionId: ExecutionIdV2; outcome: EngineV2RunOutcome }> {
		if (!this.routesToEngineV2(data)) {
			throw new UnexpectedError('Only a run that goes to engine v2 can be awaited');
		}
		if (options.timeoutMs > MAX_TIMEOUT_MS) {
			throw new UnexpectedError('The wait timeout must not be more than 24 hours', {
				extra: { timeoutMs: options.timeoutMs },
			});
		}
		if (!this.proxy.isAvailable()) throw new EngineV2UnavailableError();

		// Lazily imported: the subscriptions belong to the engine-v2 module.
		const { EngineV2LifecycleSubscriptions } = await import(
			'@/modules/engine-v2/engine-lifecycle-event-subscriptions.js'
		);
		const executionId = createExecutionIdV2();
		const ended = createDeferredPromise<EngineV2RunOutcome>();
		const removeListener = await Container.get(EngineV2LifecycleSubscriptions).listen(
			executionId,
			(event) => {
				const status = FINISHED_STATUS[event.type];
				if (status !== undefined) ended.resolve({ kind: 'finished', status });
			},
		);
		try {
			const startedId = await this.start(data, executionId);
			if (startedId !== executionId) {
				throw new UnexpectedError('Engine v2 started the run under a different id', {
					extra: { executionId, startedId },
				});
			}

			return { executionId, outcome: await waitForEnd(ended.promise, options) };
		} finally {
			removeListener();
		}
	}

	private async start(data: IWorkflowExecutionDataProcess, executionId: ExecutionIdV2) {
		try {
			return await this.runner.run({ ...data, engineV2ExecutionId: executionId });
		} catch (error) {
			try {
				await withTimeout(
					this.proxy.cancelExecution(executionId),
					CANCEL_TIMEOUT_MS,
					() => new OperationalError('Cancelling the engine v2 run timed out'),
				);
			} catch {
				// A failed or slow cancel must not hide the start error.
			}
			throw error;
		}
	}
}

async function waitForEnd(
	ended: Promise<EngineV2RunOutcome>,
	{ timeoutMs, abortSignal }: EngineV2RunWaitOptions,
): Promise<EngineV2RunOutcome> {
	let timer: NodeJS.Timeout | undefined;
	const timedOut = new Promise<EngineV2RunOutcome>((resolve) => {
		timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs).unref();
	});
	let onAbort = () => {};
	const aborted = new Promise<EngineV2RunOutcome>((resolve) => {
		onAbort = () => resolve({ kind: 'aborted' });
		if (abortSignal?.aborted) onAbort();
		else abortSignal?.addEventListener('abort', onAbort, { once: true });
	});

	try {
		// `ended` comes first, so an end that already arrived wins over a signal that is already aborted.
		return await Promise.race([ended, aborted, timedOut]);
	} finally {
		clearTimeout(timer);
		abortSignal?.removeEventListener('abort', onAbort);
	}
}
