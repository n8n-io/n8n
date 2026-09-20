import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { INodeSchema, NodeConnectionTypeSchema } from 'n8n-workflow';
import { z } from 'zod';

export const workflowJsonEditsInputSchema = z.object({
	versionId: z
		.string()
		.min(1)
		.describe('Current savedVersionId from the last build or workflow read.'),
	changes: z
		.string()
		.min(1)
		.describe(
			'JSON object with optional nodes, connections, and nodeGroups. ' +
				'Nodes must be an array, for example [{"id":"saved-node-id","parameters":{"url":"https://example.com"}}]. ' +
				'Nodes merge by saved id. Include only changed fields. Parameter keys merge at the top level; nested values replace. ' +
				'Set replaceParameters: true on a node edit to replace all its parameters, for example when changing operation or mode. ' +
				'New nodes need id, name, type, typeVersion, and parameters. Existing nodes cannot be renamed here. ' +
				'Connections replace only the named source entries. nodeGroups replaces the complete group list. ' +
				'All omitted nodes and fields stay unchanged. Use sourceCode for removals or renames.',
		),
});

const changesSchema = z
	.object({
		nodes: z
			.array(
				z
					.object({
						id: z.string().min(1),
						replaceParameters: z.boolean().optional(),
					})
					.passthrough(),
			)
			.optional(),
		connections: z
			.record(
				z.record(
					z.array(
						z.array(
							z.object({
								node: z.string(),
								type: NodeConnectionTypeSchema,
								index: z.number().int().nonnegative(),
							}),
						),
					),
				),
			)
			.optional(),
		nodeGroups: z
			.array(
				z.object({
					id: z.string(),
					name: z.string(),
					nodeIds: z.array(z.string()),
					description: z.string().optional(),
				}),
			)
			.optional(),
	})
	.strict();

/** Keep full source generation out of small repairs. The normal build path validates the result. */
export function applyWorkflowJsonEdits(workflow: WorkflowJSON, changes: string): WorkflowJSON {
	const edits = changesSchema.parse(JSON.parse(changes));
	const result = structuredClone(workflow);
	const seen = new Set<string>();
	for (const { replaceParameters, ...patch } of edits.nodes ?? []) {
		if (typeof patch.id !== 'string' || !patch.id || seen.has(patch.id)) {
			throw new Error('Each node edit must have a unique, nonempty id.');
		}
		seen.add(patch.id);
		const index = result.nodes.findIndex((node) => node.id === patch.id);
		const previous = index >= 0 ? result.nodes[index] : undefined;
		if (previous && patch.name !== undefined && patch.name !== previous.name) {
			throw new Error('Use full sourceCode to rename a node and update its references.');
		}
		if ((replaceParameters || patch.parameters !== undefined) && !isRecord(patch.parameters)) {
			throw new Error('Node parameters must be an object.');
		}
		const node = INodeSchema.parse({
			position: [0, 0],
			...previous,
			...patch,
			parameters: { ...(replaceParameters ? {} : previous?.parameters), ...patch.parameters },
		});
		if (Object.keys(patch).some((key) => !Object.hasOwn(node, key))) {
			throw new Error(`Node ${node.name} has an unsupported edit field.`);
		}
		if (index >= 0) result.nodes[index] = { ...previous, ...node };
		else result.nodes.push(node);
	}
	if (edits.connections) result.connections = { ...result.connections, ...edits.connections };
	if (edits.nodeGroups) result.nodeGroups = edits.nodeGroups;
	return result;
}
