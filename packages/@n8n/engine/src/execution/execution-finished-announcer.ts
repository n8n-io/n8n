import { createResultError, createResultOk, type Result } from '@n8n/utils/result';

import { UnexpectedError } from '../common';
import type { GraphNode } from '../graph';
import type { EngineLogger } from '../logging';
import type { EndedMessage, ExecutionResponseChannel, FailureMessage } from '../response-channel';
import type { ExecutionRecord } from './execution-store';
import { isSettledStatus, type SettledStepStatus } from './execution.types';
import type { StepRecord, StepStore } from './step-store';

type LastStep = EndedMessage['lastStep'];

type ResponseError = FailureMessage['error'];

type SettledStepRecord = StepRecord & { status: SettledStepStatus };

/**
 * Steps never unsettle, and every row here is read as one that has settled, so
 * a row that has not is a bug in the caller or the store, not a state it can
 * reach.
 */
function assertSettled(step: StepRecord): asserts step is SettledStepRecord {
	if (!isSettledStatus(step.status)) {
		throw new UnexpectedError(
			`Step ${step.nodeId} is reported as settled from status '${step.status}'`,
		);
	}
}

/** A step row as a response carries it. */
function toLastStep(step: SettledStepRecord, node: GraphNode): LastStep {
	return {
		nodeId: step.nodeId,
		nodeName: node.name,
		status: step.status,
		outputs: step.outputs,
		// Name and message only: the caller reports them, and the rest of the
		// error stays on the step row.
		error: step.error ? { name: step.error.name, message: step.error.message } : undefined,
	};
}

/**
 * Tells whoever started an execution that it is over.
 *
 * The step whose settling ends a run is not always the step that produced the
 * run's outcome: a skip settles at birth and carries none, and it can be the
 * last step to settle. This resolves which step the run answers from, so a
 * caller takes `lastStep` as it is and never looks a second step up. A run whose
 * answering step cannot be resolved is answered with a failure, not with a step
 * that carries nothing.
 */
export class ExecutionFinishedAnnouncer {
	constructor(
		private readonly stepStore: StepStore,
		private readonly responseChannel: ExecutionResponseChannel,
		private readonly logger: EngineLogger,
	) {}

	/**
	 * Announces the end of one run.
	 *
	 * Call this only where `finishExecution` won its compare-and-set, so a run
	 * announces its end exactly once however many workers raced for it.
	 */
	async announce(
		execution: ExecutionRecord,
		step: StepRecord,
		node: GraphNode,
		executionStatus: 'completed' | 'failed',
	): Promise<void> {
		const lastStep = await this.resolveLastStep(execution, step, node);
		if (!lastStep.ok) {
			this.responseChannel.publish({
				type: 'failure',
				executionId: execution.id,
				error: lastStep.error,
			});
			return;
		}

		this.responseChannel.publish({
			type: 'ended',
			executionId: execution.id,
			workflowId: execution.workflowId,
			status: executionStatus,
			lastStep: lastStep.result,
		});
	}

	/**
	 * The step the run answers from: the settling step when it completed or
	 * failed, and otherwise the step that settled last with an outcome of its
	 * own. Only a settlement that carries no outcome pays for the read.
	 */
	private async resolveLastStep(
		execution: ExecutionRecord,
		step: StepRecord,
		node: GraphNode,
	): Promise<Result<LastStep, ResponseError>> {
		assertSettled(step);

		if (step.status === 'completed' || step.status === 'failed') {
			return createResultOk(toLastStep(step, node));
		}

		try {
			// Settle order is what v1 means by the last node.
			const last = await this.stepStore.loadLastSettledStep(execution.id);
			if (!last) {
				// A run ends with its trigger completed at the least, so this is a bug
				// in the engine, not a state a run reaches.
				throw new UnexpectedError(`Execution ${execution.id} has no step that carries an outcome`);
			}
			assertSettled(last);

			const lastNode = execution.graph.nodes.find((candidate) => candidate.id === last.nodeId);
			if (!lastNode) {
				throw new UnexpectedError(
					`Step ${last.nodeId} references a node that is absent from the execution graph`,
				);
			}

			return createResultOk(toLastStep(last, lastNode));
		} catch (error) {
			this.logger.error('Could not resolve the step that answers an execution', {
				executionId: execution.id,
				error,
			});
			// The caller hears why, rather than waiting out its response timeout.
			return createResultError({
				code: 'LAST_STEP_UNRESOLVED',
				message: 'The step that answers the execution could not be resolved.',
			});
		}
	}
}
