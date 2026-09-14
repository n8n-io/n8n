import type { IConnections, INode } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

/**
 * A migration refused a specific node. Carries the node identity in `meta` so the
 * UI can link straight to it.
 */
export class WorkflowMigrationNodeError extends BadRequestError {
	constructor(
		message: string,
		readonly meta: { nodeId: string; nodeName: string },
	) {
		super(message);
		this.name = 'WorkflowMigrationNodeError';
	}
}

export interface NodeMigrationResult {
	// The replacement node's type/version/parameters. The rewrite engine keeps
	// the original node's id, name, and position, so connections are preserved.
	node: Pick<INode, 'type' | 'typeVersion' | 'parameters'>;
	// Parameters that could not be carried over (engine warns, keeps original).
	unmapped?: string[];
	// Behavior/output changes to surface to the user.
	notes?: string[];
}

/**
 * A per-node transform that swaps a deprecated node for its replacement.
 * Keyed by the breaking-change rule id that detects the deprecated node.
 */
export interface NodeMigration {
	ruleId: string;
	// Pure, per node. Return the replacement node; throw to abort with an error.
	migrate(node: INode): NodeMigrationResult;
}

export interface WorkflowMigrationInput {
	nodes: INode[];
	connections: IConnections;
	// Ids of the nodes the rule flagged. Detection decides what gets migrated.
	affectedNodeIds: Set<string>;
}

export interface WorkflowMigrationOutput {
	nodes: INode[];
	connections: IConnections;
	// Ids of the flagged nodes that were rewritten (not the nodes added around them).
	migratedNodeIds: string[];
	unmapped?: string[];
	notes?: string[];
}

/**
 * A whole-workflow transform for changes a node-for-node swap cannot express,
 * such as inserting nodes and rewiring connections. Must not mutate its input:
 * return new `nodes` and `connections`. Throw `WorkflowMigrationNodeError` to
 * refuse a specific node, or any other Error to abort the workflow.
 */
export interface WorkflowMigration {
	ruleId: string;
	migrateWorkflow(input: WorkflowMigrationInput): WorkflowMigrationOutput;
}

export type Migration = NodeMigration | WorkflowMigration;

export const isWorkflowMigration = (migration: Migration): migration is WorkflowMigration =>
	'migrateWorkflow' in migration;
