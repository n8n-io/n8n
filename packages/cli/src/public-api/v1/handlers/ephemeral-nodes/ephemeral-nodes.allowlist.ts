import type { INodeTypeDescription } from 'n8n-workflow';

// Allowlist of node types exposed via the public ephemeral-execution API.
//
// Each entry carries a curated `supportedCredentialTypes` list that defines
// the credential surface clients see for that node.
//
// To add a node: confirm it can run safely as a single-shot
export type EphemeralNodeAllowlistEntry = {
	supportedCredentialTypes: string[];
};

export const EPHEMERAL_NODE_ALLOWLIST: ReadonlyMap<string, EphemeralNodeAllowlistEntry> = new Map([
	['n8n-nodes-base.httpRequest', { supportedCredentialTypes: ['httpBearerAuth'] }],
	['n8n-nodes-base.linear', { supportedCredentialTypes: ['linearApi'] }],
]);

export const isAllowlisted = (n: INodeTypeDescription): boolean =>
	EPHEMERAL_NODE_ALLOWLIST.has(n.name);

export const isNodeTypeAllowlisted = (nodeType: string): boolean =>
	EPHEMERAL_NODE_ALLOWLIST.has(nodeType);
