import type { JsonValue } from '../common';
import type { StepError, StepSlots } from './execution.types';

/**
 * One action a step declares (ADR-20261109-steps-declare-actions-that-the-engine-runs-as-steps).
 * The engine reads only `targetNodeId` and `callId`. It carries `arguments` and
 * `metadata` without reading them. The position of an action is its index in
 * the declared list.
 */
export interface ActionDeclaration {
	/** The `attached` graph node that runs the action as a spawned step. */
	targetNodeId: string;
	/** Unique within the round. For an agent, the LLM's tool call id. */
	callId: string;
	/** The item of the declaring step's input that the action belongs to. */
	itemIndex: number;
	arguments: JsonValue;
	metadata: JsonValue;
}

/** A step result that asks the engine to run actions and continue the step afterwards. */
export interface ActionsDeclaration {
	/** Non-empty: a round without actions ends with outputs instead. */
	actions: ActionDeclaration[];
	/** What the node needs in later rounds. The engine stores it unread. */
	payload: JsonValue;
}

/** How one spawned step ended. A failed action is data, not a step failure. */
export type ActionOutcome =
	| { status: 'completed'; outputs: StepSlots }
	| { status: 'failed' | 'cancelled'; error: StepError };

export interface ContinuationRound {
	round: number;
	payload: JsonValue;
	/** In declared order, each with the outcome of its spawned step. */
	actions: Array<ActionDeclaration & { outcome: ActionOutcome }>;
}

/**
 * Every earlier round of a declaring step, in order. The engine derives it from
 * the round rows and the spawned steps. It never stores it.
 */
export interface ActionContinuation {
	rounds: ContinuationRound[];
}

/**
 * What a spawned step runs for. The engine stores no input for a spawned step:
 * it hands the executor the declaring step's gathered inputs and the action,
 * and the executor picks the item at `action.itemIndex`. The engine does not
 * read below the slot level.
 */
export interface SpawnedAction {
	declaringStepId: string;
	declaringNodeId: string;
	round: number;
	action: ActionDeclaration;
	/**
	 * The input slots of the declaring step, gathered as for its first round.
	 * Empty when the declaring step is itself spawned: see `declaringAction`.
	 */
	declaringInputs: StepSlots;
	/**
	 * Set when the declaring step is itself a spawned step (a nested agent).
	 * The executor derives the declaring step's input from it, recursively.
	 */
	declaringAction?: SpawnedAction;
	/**
	 * The attachment kind between the target and the node it attaches to on the
	 * path to the declaring node, for example `ai_tool`. Opaque to the engine.
	 */
	kind: string;
	/** The node the target attaches to: the declaring node, or an intermediate node such as an approval. */
	attachedToNodeId: string;
}
