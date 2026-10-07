import { NodeOperationError } from 'n8n-workflow';

import { getActiveCredentialType, getHost, type DatabricksContext } from '../actions/helpers';

/**
 * STAND-IN for ENT-507 (PR #40407), which owns this file.
 *
 * The real resolver reads the branch's read-write compute endpoint host from the
 * management API and the workspace ID from the `x-databricks-org-id` response
 * header of the same call, then memoises the pair per context in a WeakMap.
 *
 * This version returns the same URL shape so everything built on top is
 * structurally identical, but the host and the workspace ID are not real. Drop
 * this file when #40407 merges and take that side of the rebase whole. Do not
 * reimplement its memo, its hostname check or its error cases here: those are
 * review surface that belongs to that PR.
 */
export async function resolveLakebaseRestBase(
	context: DatabricksContext,
	project: string,
	branch: string,
): Promise<string> {
	if (!project || !branch) {
		throw new NodeOperationError(context.getNode(), 'Select a Lakebase project and branch');
	}

	const host = await getHost(context, getActiveCredentialType(context));
	return `${host}/api/2.0/workspace/0/rest`;
}
