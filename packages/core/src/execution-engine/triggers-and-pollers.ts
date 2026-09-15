import { TypedEmitter } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { NodeApiError, UnexpectedError } from 'n8n-workflow';
import type {
	Workflow,
	INode,
	INodeExecutionData,
	IPollFunctions,
	IWorkflowExecuteAdditionalData,
	WorkflowExecuteMode,
	WorkflowActivateMode,
	ITriggerResponse,
	IExecuteResponsePromiseData,
	IRun,
	ExecutionError,
} from 'n8n-workflow';
import assert from 'node:assert';

import type { IGetExecuteTriggerFunctions } from './interfaces';

/** How a poll tick's error presented, from the HTTP status the source returned. */
export type PollErrorKind = 'auth' | 'rate_limited' | 'thrown';

const classifyPollError = (error: unknown): PollErrorKind => {
	// Poll implementations often rethrow the API error wrapped in another node
	// error, so unwrap one level of `cause` before classifying.
	const apiError =
		error instanceof NodeApiError
			? error
			: error instanceof Error && error.cause instanceof NodeApiError
				? error.cause
				: undefined;
	if (apiError) {
		if (apiError.httpCode === '429') {
			return 'rate_limited';
		}
		if (apiError.httpCode === '401' || apiError.httpCode === '403') {
			return 'auth';
		}
	}
	return 'thrown';
};

type PollTickBase = {
	nodeType: string;
	durationMs: number;
	/** Whether another tick for the same node was still in flight in this process when this one started. */
	overlapped: boolean;
};

export type PollTickEventMap = {
	/** One `poll()` call finished, successfully or not. */
	'poll-tick-completed':
		| (PollTickBase & { status: 'success' })
		| (PollTickBase & { status: 'error'; errorKind: PollErrorKind });
};

@Service()
export class TriggersAndPollers {
	/** Metrics event stream for poll ticks; the host's metrics collector subscribes to it. */
	readonly events = new TypedEmitter<PollTickEventMap>();

	/** In-flight `poll()` calls per `workflowId:nodeId`, to detect overlapping ticks. */
	private readonly inFlightPolls = new Map<string, number>();

	/** Emits a tick, swallowing listener errors: a metrics sink must not fail a poll. */
	private emitTick(tick: PollTickEventMap['poll-tick-completed']): void {
		try {
			this.events.emit('poll-tick-completed', tick);
		} catch {
			// Deliberately swallowed; see above.
		}
	}

	/**
	 * Runs the trigger() implementation for an active trigger or schedule trigger node.
	 */
	async runTriggerFunction(
		workflow: Workflow,
		node: INode,
		getTriggerFunctions: IGetExecuteTriggerFunctions,
		additionalData: IWorkflowExecuteAdditionalData,
		mode: WorkflowExecuteMode,
		activation: WorkflowActivateMode,
	): Promise<ITriggerResponse | undefined> {
		const triggerFunctions = getTriggerFunctions(workflow, node, additionalData, mode, activation);

		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (!nodeType.trigger) {
			throw new UnexpectedError('Node type does not have a trigger function defined', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		if (mode === 'manual') {
			// In manual mode we do not just start the trigger function we also
			// want to be able to get informed as soon as the first data got emitted
			const triggerResponse = await nodeType.trigger.call(triggerFunctions);

			// Add the manual trigger response which resolves when the first time data got emitted
			triggerResponse!.manualTriggerResponse = new Promise((resolve, reject) => {
				const { hooks } = additionalData;
				assert.ok(hooks, 'Execution lifecycle hooks are not defined');

				triggerFunctions.emit = (
					data: INodeExecutionData[][],
					responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
					donePromise?: IDeferredPromise<IRun>,
				) => {
					if (responsePromise) {
						hooks.addHandler('sendResponse', (response) => responsePromise.resolve(response));
					}

					if (donePromise) {
						hooks.addHandler('workflowExecuteAfter', (runData) => donePromise.resolve(runData));
					}

					resolve(data);
				};

				triggerFunctions.emitError = (
					error: Error,
					responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>,
				) => {
					if (responsePromise) {
						hooks.addHandler('sendResponse', () => responsePromise.reject(error));
					}
					reject(error);
				};

				triggerFunctions.saveFailedExecution = (error: ExecutionError) => {
					reject(error);
				};
			});

			return this.wrapCloseFunctionInIsolate(workflow, triggerResponse);
		}
		// In all other modes simply start the trigger
		return this.wrapCloseFunctionInIsolate(workflow, await nodeType.trigger.call(triggerFunctions));
	}

	/**
	 * Wraps a trigger's `closeFunction` so teardown holds an expression isolate:
	 * the closure evaluates expressions through this workflow's expression
	 * instance, which is no longer in scope at the eventual close call sites.
	 */
	private wrapCloseFunctionInIsolate(
		workflow: Workflow,
		response: ITriggerResponse | undefined,
	): ITriggerResponse | undefined {
		const closeFunction = response?.closeFunction;
		if (response && closeFunction) {
			response.closeFunction = async () =>
				await workflow.expression.withIsolate(async () => await closeFunction.call(response));
		}
		return response;
	}

	/**
	 * Runs the poll() implementation for a poll trigger node.
	 */
	async runPollFunction(
		workflow: Workflow,
		node: INode,
		pollFunctions: IPollFunctions,
	): Promise<INodeExecutionData[][] | null> {
		const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

		if (!nodeType.poll) {
			throw new UnexpectedError('Node type does not have a poll function defined', {
				extra: { nodeName: node.name },
				tags: { nodeType: node.type },
			});
		}

		const pollKey = `${workflow.id}:${node.id}`;
		const inFlight = this.inFlightPolls.get(pollKey) ?? 0;
		const overlapped = inFlight > 0;
		this.inFlightPolls.set(pollKey, inFlight + 1);
		const startedAt = performance.now();
		try {
			const result = await nodeType.poll.call(pollFunctions);
			this.emitTick({
				nodeType: node.type,
				status: 'success',
				durationMs: performance.now() - startedAt,
				overlapped,
			});
			return result;
		} catch (error) {
			this.emitTick({
				nodeType: node.type,
				status: 'error',
				errorKind: classifyPollError(error),
				durationMs: performance.now() - startedAt,
				overlapped,
			});
			throw error;
		} finally {
			const remaining = (this.inFlightPolls.get(pollKey) ?? 1) - 1;
			if (remaining > 0) {
				this.inFlightPolls.set(pollKey, remaining);
			} else {
				this.inFlightPolls.delete(pollKey);
			}
		}
	}
}
