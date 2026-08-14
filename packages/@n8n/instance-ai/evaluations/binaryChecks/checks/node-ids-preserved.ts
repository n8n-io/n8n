import type { BinaryCheck } from '../types';

/**
 * Editing a workflow must not move node identity.
 *
 * A node's id is its stable identity in n8n: execution logs pair a run against the canvas
 * by it, and `(workflowId, nodeId)` keys poll cursors, deduplication records and publication
 * status. Re-identifying a node the user still has silently resets all of that, strikes its
 * name through in the logs panel, and makes the version diff read as deleted + re-added
 * (INS-970, INS-1120, INS-1179).
 *
 * Only nodes present on both sides *under the same name* are compared, so a rename or a
 * deletion can never trip this — a name missing from the result is simply not this check's
 * business. That leaves exactly one failure mode: a node the agent kept, under the name it
 * kept, whose identity changed anyway.
 *
 * Scope, measured rather than assumed: this only has teeth when the build went through the
 * TypeScript SDK path (`get-as-code` → `.ts` → `build-workflow`), which is where codegen can
 * drop an id. A build from a WorkflowJSON (`.json`) source copies `nodes` through verbatim, so
 * ids survive there no matter what and this check passes without asserting anything. The
 * deterministic guard for the codegen round trip itself is
 * `src/tools/workflows/__tests__/get-as-code-node-identity.test.ts`.
 */
export const nodeIdsPreserved: BinaryCheck = {
	name: 'node_ids_preserved',
	description: 'Nodes that survive an edit keep their original node id',
	kind: 'deterministic',
	dimension: 'structure',
	run(workflow, ctx) {
		const before = ctx.workflowBefore?.nodes ?? [];
		// From-scratch builds have no prior identity to preserve.
		if (before.length === 0) return { pass: true, applicable: false };

		const idsAfterByName = new Map((workflow.nodes ?? []).map((node) => [node.name, node.id]));
		const reidentified: string[] = [];

		for (const node of before) {
			if (!node.id || !node.name) continue;

			const idAfter = idsAfterByName.get(node.name);
			// Absent means renamed or deleted — neither is an identity violation.
			if (idAfter === undefined || idAfter === node.id) continue;

			reidentified.push(`${node.name} (${node.id} -> ${idAfter})`);
		}

		return {
			pass: reidentified.length === 0,
			...(reidentified.length > 0
				? {
						comment: `Surviving nodes were given new ids: ${reidentified.join(', ')}`,
					}
				: {}),
		};
	},
};
