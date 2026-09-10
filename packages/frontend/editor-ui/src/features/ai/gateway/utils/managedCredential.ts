import type { INode, INodeCredentialsDetails } from 'n8n-workflow';

/**
 * Builds the credential value that marks a slot as managed by Gateway
 * credits. Both the single-node selector (`NodeCredentials.vue`) and the
 * bulk-apply flow (`useApplyGatewayCredential`) write this same shape, so a
 * future change to it cannot let the two paths drift apart.
 */
export function buildManagedCredentialValue(): INodeCredentialsDetails {
	return { id: null, name: '', __aiGatewayManaged: true };
}

/**
 * Plain-boolean wrapper around the store's `hasGatewayManagedCredential`. That
 * function is a `node is INode` guard for its `INode | null` callers elsewhere;
 * called on an already-non-null node, TypeScript narrows the negative branch to
 * `never` and breaks every later `node.*` access. Losing the predicate type here
 * avoids that.
 */
export function isNodeGatewayManaged(
	hasGatewayManagedCredential: (node: INode | null) => node is INode,
	node: INode,
): boolean {
	return hasGatewayManagedCredential(node);
}
