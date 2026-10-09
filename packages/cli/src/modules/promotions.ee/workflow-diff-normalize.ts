import { jsonParse, type INode } from 'n8n-workflow';

import { visitWorkflowCredentials } from '@/modules/n8n-packages/entities/credential/workflow-credential-references';

/**
 * Canonical JSON of a workflow with its node credential names blanked. A node
 * keeps a `name` next to each credential id, but the binding resolves by id and
 * the name is only a display cache. Returns undefined when the content is not a
 * well-formed workflow (bad JSON, or a node that is not an object), so a caller
 * keeps the original difference instead of hiding a change it cannot read.
 */
function canonicalWithoutCredentialNames(content: string): string | undefined {
	try {
		const parsed = jsonParse<{ nodes?: INode[] }>(content);
		visitWorkflowCredentials(parsed.nodes, (_type, details) => {
			if (details.name === '') return false;
			details.name = '';
			return true;
		});
		return JSON.stringify(parsed);
	} catch {
		return undefined;
	}
}

/**
 * True when two workflow files differ only by the credential names embedded in
 * their nodes. The binding resolves by id and the name drifts between instances
 * after a rename, so the promotion diff can treat such a pair as unchanged. A
 * malformed file on either side is never treated as name-only.
 */
export function workflowChangeIsCredentialNameOnly(base: string, desired: string): boolean {
	const canonicalBase = canonicalWithoutCredentialNames(base);
	const canonicalDesired = canonicalWithoutCredentialNames(desired);
	return (
		canonicalBase !== undefined &&
		canonicalDesired !== undefined &&
		canonicalBase === canonicalDesired
	);
}
