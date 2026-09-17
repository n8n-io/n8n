import { UnexpectedError } from '../common';
import type { GraphNode } from '../graph';
import type { EngineLogger } from '../logging';
import type { EndedMessage, ExecutionResponseChannel } from '../response-channel';
import type { ExecutionRecord } from './execution-store';
import { isSettledStatus, type SettledStepStatus } from './execution.types';
import type { StepRecord, StepStore } from './step-store';

type LastStep = EndedMessage['lastStep'];

/** A step row as a response carries it. */
function toLastStep(step: StepRecord, status: SettledStepStatus, node: GraphNode): LastStep {
	return {
		nodeId: step.nodeId,
		nodeName: node.name,
		status,
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
 * caller takes `lastStep` as it is and never looks a second step up.
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
		status: 'completed' | 'failed',
	): Promise<void> {
		this.responseChannel.publish({
			type: 'ended',
			executionId: execution.id,
			workflowId: execution.workflowId,
			status,
			lastStep: await this.resolveLastStep(execution, step, node),
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
	): Promise<LastStep> {
		if (!isSettledStatus(step.status)) {
			// Steps never unsettle, and this runs only once a step has settled, so
			// this is a bug in the caller, not a state this step can reach.
			throw new UnexpectedError(
				`Step ${step.nodeId} announced its end from status '${step.status}'`,
			);
		}

		const settling = toLastStep(step, step.status, node);
		if (step.status === 'completed' || step.status === 'failed') return settling;

		try {
			// Settle order is what v1 means by the last node.
			const last = await this.stepStore.loadLastSettledStep(execution.id);
			// The store answers with settled rows only; the check is what makes that
			// a type.
			if (!last || !isSettledStatus(last.status)) return settling;

			const lastNode = execution.graph.nodes.find((candidate) => candidate.id === last.nodeId);
			if (!lastNode) return settling;

			return toLastStep(last, last.status, lastNode);
		} catch (error) {
			// An answer without an outcome beats a caller that waits for its timeout.
			this.logger.warn('could not resolve the last step that settled', {
				executionId: execution.id,
				error,
			});
			return settling;
		}
	}
}
