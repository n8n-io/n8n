import type { WorkflowGraph } from '../graph';
import type {
	ExecutionMode,
	ExecutionStatus,
	StepError,
	StepSlots,
	StepStatus,
} from './execution.types';

/**
 * Read view of an execution: what a caller is shown, which is not what running
 * one needs. It carries the timing the execution path never reads, and omits
 * `triggerOutputs`, which only the start handler consumes.
 */
export interface ExecutionView {
	id: string;
	workflowId: string;
	status: ExecutionStatus;
	mode: ExecutionMode;
	/** The graph captured at start, immutable for the execution's lifetime. */
	graph: WorkflowGraph;
	createdAt: Date;
	updatedAt: Date;
	finishedAt: Date | null;
}

/**
 * Read view of a step. It carries the timing and the error the execution path
 * writes but never reads back, and omits `executionId`: a step is only ever
 * read under the execution that owns it.
 */
export interface StepView {
	id: string;
	nodeId: string;
	iteration: number;
	status: StepStatus;
	/** Outputs of a completed step, indexed by output slot; `null` until it completes. */
	outputs: StepSlots | null;
	/** The error that failed the step; `null` unless it failed. */
	error: StepError | null;
	createdAt: Date;
	updatedAt: Date;
}

/** An execution with its steps, read as one query so the two cannot disagree. */
export interface ExecutionWithStepsView extends ExecutionView {
	/** Every step of the execution, oldest first. Empty if it has run none yet. */
	steps: StepView[];
}

/**
 * Persistence interface for the read path, held apart from `ExecutionStore` and
 * `StepStore` so a reader cannot reach a transition, and so read concerns
 * (projection, pagination) can grow without widening the interfaces the engine
 * runs on.
 *
 * A projection is only as real as the SQL behind it: these types are
 * structural, so an adapter returning whole rows still type-checks. Name the
 * columns in the query.
 */
export interface ExecutionViewStore {
	/** Read view of one execution. Throws `ExecutionNotFoundError` if absent. */
	loadExecutionView(id: string): Promise<ExecutionView>;

	/**
	 * Read view of one execution and its steps. One query, so the status a caller
	 * reports cannot predate the steps it reports beside it. Throws
	 * `ExecutionNotFoundError` if absent.
	 */
	loadExecutionWithStepsView(id: string): Promise<ExecutionWithStepsView>;
}
