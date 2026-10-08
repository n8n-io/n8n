import type {
	LinkedInstanceRemoteProject,
	LinkedInstanceTransferCredential,
	LinkedInstanceTransferCredentialStatus,
	LinkedInstanceTransferPreflight,
	LinkedInstanceTransferSubWorkflow,
} from '@n8n/api-types';

import {
	type CredentialSummary,
	uniqueSorted,
} from '@/modules/n8n-packages/capabilities/package-requirements';

/** What the workflow needs, as this instance sees it. */
export type LocalTransferRequirements = {
	workflowName: string;
	nodeCount: number;
	/** Node types as "type@version". Duplicates are allowed. */
	nodeTypes: readonly string[];
	/** The credentials of the nodes, with their names in this instance. Duplicates are allowed. */
	credentials: readonly CredentialSummary[];
	subWorkflowCalls: readonly LinkedInstanceTransferSubWorkflow[];
};

/** What the linked instance told about itself. */
export type RemoteTransferContext = {
	/** `null` when the linked instance lists no node types that a program can compare. */
	nodeTypes: readonly string[] | null;
	/** `null` when the linked instance did not list its credentials. */
	credentials: RemoteCredentialList | null;
	targetProject: LinkedInstanceRemoteProject | null;
};

export type RemoteCredentialList = {
	credentials: readonly CredentialSummary[];
	/** `false` when the list can leave out credentials, for example at the result limit of the tool. */
	complete: boolean;
};

const credentialKey = ({ name, type }: CredentialSummary) => JSON.stringify([name, type]);

function compareCredentials(a: CredentialSummary, b: CredentialSummary): number {
	return a.name.localeCompare(b.name) || a.type.localeCompare(b.type);
}

/** Each name and type once, sorted, as the export lists them in the package. The import matches on both. */
function uniqueCredentials(credentials: readonly CredentialSummary[]): CredentialSummary[] {
	const byKey = new Map(
		credentials.map(({ name, type }) => [credentialKey({ name, type }), { name, type }]),
	);
	return [...byKey.values()].sort(compareCredentials);
}

function credentialStatus(
	credential: CredentialSummary,
	remote: RemoteCredentialList | null,
	remoteKeys: ReadonlySet<string>,
): LinkedInstanceTransferCredentialStatus {
	if (remote === null) return 'unknown';
	if (remoteKeys.has(credentialKey(credential))) return 'matched';
	// A credential that a partial list leaves out can still be there.
	return remote.complete ? 'needs-set-up' : 'unknown';
}

/**
 * The status of each credential that the workflow uses, once for each name and type. The import
 * matches credentials by exact name and type, so a credential with another case or type does
 * not match.
 */
export function matchCredentials(
	local: readonly CredentialSummary[],
	remote: RemoteCredentialList | null,
): LinkedInstanceTransferCredential[] {
	const remoteKeys = new Set((remote?.credentials ?? []).map(credentialKey));
	return uniqueCredentials(local).map((credential) => ({
		...credential,
		status: credentialStatus(credential, remote, remoteKeys),
	}));
}

/** The node types that the linked instance does not list, sorted and unique. */
export function missingNodeTypes(
	local: readonly string[],
	remote: readonly string[] | null,
): string[] {
	if (remote === null) return [];
	const available = new Set(remote);
	return uniqueSorted(local).filter((nodeType) => !available.has(nodeType));
}

/** Merges what this instance and the linked instance know into the preflight of a move. */
export function buildTransferPreflight(
	local: LocalTransferRequirements,
	remote: RemoteTransferContext,
): LinkedInstanceTransferPreflight {
	return {
		workflowName: local.workflowName,
		moves: { nodes: local.nodeCount },
		nodeTypeCheck: remote.nodeTypes === null ? 'unknown' : 'checked',
		missingNodeTypes: missingNodeTypes(local.nodeTypes, remote.nodeTypes),
		credentials: matchCredentials(local.credentials, remote.credentials),
		targetProject: remote.targetProject,
		subWorkflowCalls: [...local.subWorkflowCalls],
	};
}
