import type { StepExecutionContext } from '@n8n/engine';
import type {
	ExecuteWorkflowData,
	IExecuteWorkflowInfo,
	INode,
	INodeExecutionData,
} from 'n8n-workflow';
import { v7 as uuidv7 } from 'uuid';

import { EXECUTE_WORKFLOW_TYPE } from './constants';
import {
	InlineSubWorkflowError,
	RepeatedSubWorkflowCallError,
	SubWorkflowsNotSupportedError,
	UnsupportedSubWorkflowCallerError,
} from './errors';
import type { CallOptions, SubWorkflowResolveResult, SubWorkflowResolver } from './types';
import { toV1ExecuteMode } from './v1-adapters';

/**
 * The sub-workflow calls of a node's first run. A call becomes a sub-execution
 * the engine starts: awaited, which suspends the step, or detached, which rides
 * on the outputs. When an awaited sub-execution ends the node runs again, and
 * `supplySubExecutionResult` answers the same call from the result instead.
 *
 * Only a node that runs through `DurableWaitExecuteContext` reaches this: the
 * Execute Sub-workflow node and its kind, whose work before the call has no
 * side effect. An AI Agent tool calls through a supply-data context, which
 * keeps the host's unimplemented `executeWorkflow`, so it never replays here.
 */
export class SubWorkflowCalls {
	/** The sub-execution the node asked for, once a call was made. */
	declaration?: { executionId: string } & SubWorkflowResolveResult &
		({ awaited: true } | { awaited: false });
	private called = false;

	constructor(
		private readonly node: INode,
		private readonly stepContext: StepExecutionContext,
		private readonly resolve?: SubWorkflowResolver,
	) {}

	/**
	 * Resolves the sub-workflow through the host and records the sub-execution for
	 * the engine to start. The node gets an empty result for an awaited call, and
	 * its input back for a detached one, as v1 gives it.
	 */
	async declareSubExecution(
		workflowInfo: IExecuteWorkflowInfo,
		items: INodeExecutionData[],
		options: CallOptions = {},
	): Promise<ExecuteWorkflowData> {
		// A second call would start a second sub-execution the engine cannot wait for.
		// The first one is dropped too, so no sub-execution starts for a run that fails,
		// whichever way the node reports the failure.
		if (this.called) {
			this.declaration = undefined;
			throw new RepeatedSubWorkflowCallError(this.node.name);
		}
		this.called = true;

		if (this.node.type !== EXECUTE_WORKFLOW_TYPE) {
			throw new UnsupportedSubWorkflowCallerError(this.node.name, this.node.type);
		}
		if (workflowInfo.id === undefined) throw new InlineSubWorkflowError(this.node.name);
		if (!this.resolve) throw new SubWorkflowsNotSupportedError(this.node.name);

		// Minted here, before the sub-execution is resolved, so its trigger runs under it
		// and a fire-and-forget node reports the id as v1 does.
		const executionId = uuidv7();
		const { id, name, type, typeVersion } = this.node;
		const resolved = await this.resolve({
			workflowId: workflowInfo.id,
			executionId,
			parent: {
				executionId: this.stepContext.executionId,
				workflowId: this.stepContext.workflowId,
				mode: toV1ExecuteMode(this.stepContext),
				node: { id, name, type, typeVersion },
			},
			context: {
				userId: this.stepContext.callerContext.userId,
				projectId: this.stepContext.callerContext.projectId,
			},
			items,
		});
		if (options.doNotWaitToFinish) {
			this.declaration = { executionId, ...resolved, awaited: false };
			return { executionId, data: [null] };
		}

		// The node completes this run on an empty result, which the executor
		// replaces with the sub-execution declaration. It runs again with the result when
		// the sub-execution ends.
		this.declaration = { executionId, ...resolved, awaited: true };
		return { executionId, data: [[]] };
	}
}
