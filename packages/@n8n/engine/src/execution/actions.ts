import { UnexpectedError } from '../common';
import {
	createNodeLabeler,
	findActionTargetPath,
	type GraphNode,
	type WorkflowGraph,
} from '../graph';
import type {
	ActionContinuation,
	ActionOutcome,
	ActionsDeclaration,
	ContinuationRound,
} from './actions.types';
import type { ActionLimits, RoundRecord, StepRecord } from './step-store';

/** The most rounds one execution can record, over all its declaring steps. */
export const DEFAULT_MAX_ROUNDS_PER_EXECUTION = 100;

/** The most spawned steps one execution can create, over all its rounds. */
export const DEFAULT_MAX_SPAWNED_STEPS_PER_EXECUTION = 1000;

export const DEFAULT_ACTION_LIMITS: ActionLimits = {
	maxRoundsPerExecution: DEFAULT_MAX_ROUNDS_PER_EXECUTION,
	maxSpawnedStepsPerExecution: DEFAULT_MAX_SPAWNED_STEPS_PER_EXECUTION,
};

/** A step declared actions that the engine cannot run. The step fails with it. */
export class InvalidActionsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidActionsError';
	}
}

/** A round would take the execution over a cap. The declaring step fails with it. */
export class ActionLimitError extends Error {
	constructor(nodeName: string, limit: keyof ActionLimits, value: number, max: number) {
		super(`${nodeName} goes over the limit ${limit} of ${max} for one execution (${value})`);
		this.name = 'ActionLimitError';
	}
}

/**
 * Rejects actions the engine cannot run. Throwing fails the declaring step,
 * which is the rule for a node that declares invalid actions
 * (ADR-20261109-steps-declare-actions-that-the-engine-runs-as-steps, decision 1,
 * and ADR-20261109-attach-sub-nodes-to-the-graph-outside-its-edges, decision 5).
 */
export function validateActionsDeclaration(
	graph: WorkflowGraph,
	node: GraphNode,
	declaration: ActionsDeclaration,
): void {
	const name = createNodeLabeler(graph);
	if (!node.actionTargetKinds?.length) {
		throw new InvalidActionsError(`${name(node.id)} declares actions, but its node cannot`);
	}
	if (declaration.actions.length === 0) {
		throw new InvalidActionsError(
			`${name(node.id)} declares a round without actions; a round without actions must end with outputs`,
		);
	}

	const callIds = new Set<string>();
	for (const action of declaration.actions) {
		if (callIds.has(action.callId)) {
			throw new InvalidActionsError(
				`${name(node.id)} declares the call id ${action.callId} more than once in one round`,
			);
		}
		callIds.add(action.callId);

		if (!Number.isInteger(action.itemIndex) || action.itemIndex < 0) {
			throw new InvalidActionsError(
				`${name(node.id)} declares an action for item ${action.itemIndex}, which is not an item index`,
			);
		}
		if (!findActionTargetPath(graph, node.id, action.targetNodeId)) {
			throw new InvalidActionsError(
				`${name(node.id)} declares an action on ${name(action.targetNodeId)}, which is not attached to it as an action target`,
			);
		}
	}
}

/**
 * The continuation of a declaring step: every round in order, each with its
 * actions in declared order and the outcome of each action's spawned step.
 * Call it only when every spawned step of every round has settled.
 */
export function buildContinuation(
	rounds: RoundRecord[],
	spawnedSteps: StepRecord[],
): ActionContinuation {
	const byCall = new Map(spawnedSteps.map((step) => [`${step.round}:${step.callId}`, step]));
	const ordered = [...rounds].sort((a, b) => a.round - b.round);

	return {
		rounds: ordered.map(
			(round): ContinuationRound => ({
				round: round.round,
				payload: round.payload,
				actions: round.actions.map((action) => {
					const step = byCall.get(`${round.round}:${action.callId}`);
					if (!step) {
						throw new UnexpectedError(
							`round ${round.round} of step ${round.stepId} declares call ${action.callId}, which has no spawned step`,
						);
					}
					return { ...action, outcome: outcomeOf(step) };
				}),
			}),
		),
	};
}

function outcomeOf(step: StepRecord): ActionOutcome {
	if (step.status === 'completed') return { status: 'completed', outputs: step.outputs ?? [] };
	if (step.status === 'failed') {
		return {
			status: 'failed',
			error: step.error ?? { name: 'Error', message: `The action ${step.callId} failed` },
		};
	}
	if (step.status === 'cancelled') {
		return {
			status: 'cancelled',
			error: { name: 'CancelledError', message: `The action ${step.callId} was cancelled` },
		};
	}
	throw new UnexpectedError(
		`spawned step ${step.id} is ${step.status}, but the continuation needs every action settled`,
	);
}
