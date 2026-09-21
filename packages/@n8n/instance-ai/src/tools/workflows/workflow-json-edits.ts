import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { INodeSchema, isSafeObjectProperty, NodeConnectionTypeSchema } from 'n8n-workflow';
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
			'JSON object with optional nodes, connections, and nodeGroups, or a JSON array of node edits. ' +
				'Nodes must be an array, for example [{"id":"saved-node-id","parameters":{"url":"https://example.com"}}]. ' +
				'Nodes merge by saved id. Include only changed fields. Parameter keys merge at the top level; nested values replace. ' +
				'For a nested value, use parameterUpdates instead of parameters: [{"id":"saved-node-id","parameterUpdates":[{"path":["assignments","assignments",2,"value"],"value":60}]}]. ' +
				'Each path starts inside parameters and must already exist. Use string object keys and numeric array indices from the workflow read. Code preserves all other values and row IDs. Do not combine parameterUpdates with parameters or replaceParameters. ' +
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
						id: z.string().min(1).optional(),
						replaceParameters: z.boolean().optional(),
						parameterUpdates: z
							.array(
								z
									.object({
										path: z
											.array(z.union([z.string().min(1), z.number().int().nonnegative()]))
											.min(1)
											.max(32),
										value: z.unknown(),
									})
									.strict()
									.refine(
										(update) => Object.hasOwn(update, 'value'),
										'Each parameter update needs a value.',
									),
							)
							.min(1)
							.max(100)
							.optional(),
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
export function applyWorkflowJsonEdits(
	workflow: WorkflowJSON,
	changes: string,
	options: { allowNameLookup?: boolean } = {},
): WorkflowJSON {
	const parsed: unknown = JSON.parse(changes);
	const edits = changesSchema.parse(Array.isArray(parsed) ? { nodes: parsed } : parsed);
	const result = structuredClone(workflow);
	const seen = new Set<string>();
	for (const { replaceParameters, parameterUpdates, ...patch } of edits.nodes ?? []) {
		if (patch.id === undefined && options.allowNameLookup && typeof patch.name === 'string') {
			const matches = workflow.nodes.filter((node) => node.name === patch.name);
			if (matches.length !== 1 || !matches[0].id) {
				throw new Error('A draft node name must match exactly one existing node with an id.');
			}
			patch.id = matches[0].id;
		}
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
		if (
			parameterUpdates &&
			(!previous || patch.parameters !== undefined || replaceParameters !== undefined)
		) {
			throw new Error('Use parameterUpdates alone for parameters on an existing node.');
		}
		const parameters = { ...(replaceParameters ? {} : previous?.parameters), ...patch.parameters };
		const updatedPaths: Array<Array<string | number>> = [];
		for (const { path, value } of parameterUpdates ?? []) {
			if (
				updatedPaths.some(
					(other) =>
						other.every((part, i) => part === path[i]) ||
						path.every((part, i) => part === other[i]),
				)
			) {
				throw new Error('Parameter update paths must not repeat or overlap.');
			}
			updatedPaths.push(path);
			let target: unknown = parameters;
			for (const [index, key] of path.entries()) {
				const last = index === path.length - 1;
				if (Array.isArray(target) && typeof key === 'number' && Object.hasOwn(target, key)) {
					const array: unknown[] = target;
					if (last) array[key] = value;
					else target = array[key];
				} else if (
					isRecord(target) &&
					typeof key === 'string' &&
					isSafeObjectProperty(key) &&
					Object.hasOwn(target, key)
				) {
					if (last) target[key] = value;
					else target = target[key];
				} else {
					throw new Error(
						'Each parameter update path must match an existing value. Read the current parameters.',
					);
				}
			}
		}
		const node = INodeSchema.parse({
			position: [0, 0],
			...previous,
			...patch,
			parameters,
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
