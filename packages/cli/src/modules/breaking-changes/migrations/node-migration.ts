import type { INode } from 'n8n-workflow';

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
