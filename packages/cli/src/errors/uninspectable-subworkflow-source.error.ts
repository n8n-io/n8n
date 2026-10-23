import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export class UninspectableSubworkflowSourceError extends NodeOperationError {
	constructor(node: INode) {
		super(
			node,
			`The '${node.name}' node loads its sub-workflow from a source that is resolved only when the workflow runs, so its credential access cannot be checked on save. Use the "Database" or "Define Below" source instead.`,
		);
	}
}
