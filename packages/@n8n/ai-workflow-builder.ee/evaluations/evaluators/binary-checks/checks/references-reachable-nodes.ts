import { getParentNodes, mapConnectionsByDestination } from 'n8n-workflow';
import type { IConnections, INode } from 'n8n-workflow';

import type { BinaryCheck, SimpleWorkflow } from '../types';
import {
	extractExpressionsFromParams,
	extractNodeNamesFromExpression,
} from './expressions-reference-existing-nodes';

function nodeReferenceIsInvalid(parents: Set<string>, nodeReference: string): boolean {
	return !parents.has(nodeReference);
}

function nodeIsInvalid(connectionsByDest: IConnections, node: INode): boolean {
	if (!node.parameters) return false;

	const expressions = extractExpressionsFromParams(node.parameters);
	const referencedNames = expressions.flatMap((expr: string) =>
		extractNodeNamesFromExpression(expr),
	);
	const uniqReferencedNames = new Set<string>(referencedNames);

	if (uniqReferencedNames.size === 0) return false;

	const parents = new Set(getParentNodes(connectionsByDest, node.name, 'main', -1));
	const invalidReferences = [...uniqReferencedNames].filter((nodeRef) =>
		nodeReferenceIsInvalid(parents, nodeRef),
	);
	return invalidReferences.length > 0;
}

/**
 * This deterministic check checks that every time a node references
 * another node by name that node must be an ancestor, i.e. it must
 * be reachable by following the parent chain upstream, using the same
 * logic that the frontend implements currently in `workflow-data-proxy.ts`
 *
 * Fails when:
 * 1. The referenced node does not exist in the workflow. (this actually
 * makes "expressions_reference_existing_nodes" redundant)
 * 2. The referenced node is not an ancestor of the current node.
 */
export const referencesReachableNodes: BinaryCheck = {
	name: 'references_reachable_nodes',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		if (!workflow.nodes || workflow.nodes.length === 0) {
			return { pass: true };
		}

		const connections = workflow.connections ?? {};
		const connectionsByDest = mapConnectionsByDestination(connections);

		const allInvalidNodes = workflow.nodes.filter((node) => nodeIsInvalid(connectionsByDest, node));
		const unique = [...new Set(allInvalidNodes)];
		const uniqueNames = unique.map((node) => node.name);

		return {
			pass: unique.length === 0,
			...(uniqueNames.length > 0 ? { comment: `Broken nodes: ${uniqueNames.join('; ')}` } : {}),
		};
	},
};
