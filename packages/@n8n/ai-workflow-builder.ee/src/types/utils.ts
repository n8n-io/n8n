import type { WorkflowState } from '../workflow-state';

/**
 * Type for state updater functions
 */
export type StateUpdater<TState = typeof WorkflowState.State> =
	| Partial<TState>
	| ((state: TState) => Partial<TState>);
