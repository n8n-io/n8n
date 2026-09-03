import { Service } from '@n8n/di';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IExecuteResponsePromiseData,
	IRun,
	IWorkflowBase,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';

/** What an active trigger asks for when it hands items over. */
export type EngineV2ActiveTriggerEmit = {
	/** Set when the node wants the response a node inside the run produced. */
	responsePromise?: IDeferredPromise<IExecuteResponsePromiseData>;
	/** Set when the node wants the finished run. */
	donePromise?: IDeferredPromise<IRun | undefined>;
};

/**
 * The active-trigger surface's seam to engine 2.0.
 *
 * The trigger node itself still runs control-plane-side, so only the start call
 * changes for a v2 workflow. This decides whether a run takes that path, and
 * rejects the parts of the surface the path does not serve yet.
 *
 * A workflow that opted into engine 2.0 never falls back to v1, so each case
 * fails with the reason instead. These checks live here rather than in
 * {@link EngineV2Dispatcher} because they need the emit's promises, which never
 * reach the dispatcher.
 */
@Service()
export class EngineV2ActiveTriggers {
	constructor(private readonly dispatcher: EngineV2Dispatcher) {}

	/** Whether this trigger run starts on the engine 2.0 data plane. */
	handles(workflowData: IWorkflowBase, mode: WorkflowExecuteMode): boolean {
		return this.dispatcher.handlesWorkflow(workflowData, mode);
	}

	/**
	 * Rejects an emit that waits for its own run.
	 *
	 * A node passes either promise when it settles its source only once the run
	 * finishes — a broker ack, a consumer offset. A v2 run keeps no control-plane
	 * execution row, so `getPostExecutePromise` has nothing to await and neither
	 * promise can carry a result. Starting the run anyway would leave the node
	 * waiting, and its source would redeliver the same message forever.
	 */
	assertSupported({ responsePromise, donePromise }: EngineV2ActiveTriggerEmit): void {
		if (responsePromise === undefined && donePromise === undefined) return;

		throw new UserError(
			'Engine 2.0 cannot run a trigger that waits for its execution to finish yet. Set the node to hand off without waiting.',
		);
	}

	/**
	 * Rejects a polled emit.
	 *
	 * A migrated poll node commits its cursor in the same transaction as the
	 * execution row, which a v2 run does not create.
	 * TODO(CAT-4078): commit the cursor against a data-plane execution instead.
	 */
	assertPollSupported(): never {
		throw new UserError('Engine 2.0 cannot run polling triggers yet.');
	}
}
