import type { INodeParameters } from 'n8n-workflow';

/**
 * The `config` payload the converter writes onto a `v1-node` `GraphNode` and the
 * v1 step executor reads back. The engine persists it opaquely (as part of the
 * graph `jsonb`) and never inspects it; only this compatibility layer does.
 *
 * There is no discriminant field: consumers narrow via `GraphNode.type ===
 * 'v1-node'`, which they already have.
 *
 * Credentials are intentionally absent — deferred to a later milestone.
 */
export interface V1NodeStepConfig {
	/** Fully-qualified v1 node type, e.g. `n8n-nodes-base.set`. */
	nodeType: string;
	typeVersion: number;
	/** The node's parameters verbatim; expression strings resolve at execution time. */
	parameters: INodeParameters;
	/** Whether the node continues (rather than failing the step) on error. */
	continueOnFail: boolean;
}
