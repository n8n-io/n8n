import {
	generateDeterministicGroupId,
	generateDeterministicNodeId,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import { INodeSchema, NodeConnectionTypeSchema, UserError } from 'n8n-workflow';
import { z } from 'zod';

import { parseWorkflowJsonSource } from './workflow-source-compiler';

export const workflowGraphSchema = z
	.object({
		nodes: z
			.array(
				z
					.object({
						name: z.string().min(1),
						type: z.string().min(1),
						typeVersion: z.number().positive(),
						parameters: z.record(z.unknown()),
						options: z
							.record(z.unknown())
							.optional()
							.describe(
								'Optional node settings, such as alwaysOutputData, onError, retryOnFail, maxTries, notes, or existing credential references. Do not include id, name, type, typeVersion, parameters, or position.',
							),
					})
					.strict(),
			)
			.min(1),
		edges: z.array(
			z
				.object({
					from: z.string().min(1).describe('Source node name.'),
					to: z.string().min(1).describe('Target node name.'),
					output: z
						.number()
						.int()
						.min(0)
						.max(1000)
						.optional()
						.describe('Source output index. Default: 0.'),
					input: z
						.number()
						.int()
						.min(0)
						.max(1000)
						.optional()
						.describe('Target input index. Default: 0.'),
					type: NodeConnectionTypeSchema.optional().describe('Connection type. Default: main.'),
				})
				.strict(),
		),
		groups: z
			.array(
				z
					.object({
						name: z.string().min(1),
						nodes: z.array(z.string().min(1)).min(1).describe('Member node names.'),
						description: z.string().optional(),
					})
					.strict(),
			)
			.optional(),
		settings: z.record(z.unknown()).optional(),
	})
	.strict();

/** Assemble the graph without model calls. The normal build path validates node parameters. */
export function compileWorkflowGraph(
	name: string,
	input: z.infer<typeof workflowGraphSchema>,
): WorkflowJSON {
	const graph = workflowGraphSchema.parse(input);
	const ids = new Map<string, string>();
	const nodes = graph.nodes.map(({ options, ...node }) => {
		if (ids.has(node.name)) throw new UserError(`Duplicate node name: ${node.name}.`);
		const id = generateDeterministicNodeId(name, node.type, node.name);
		ids.set(node.name, id);
		const parsed = INodeSchema.parse({ ...options, ...node, id, position: [0, 0] });
		for (const key of Object.keys(options ?? {})) {
			if (
				['id', 'name', 'type', 'typeVersion', 'parameters', 'position'].includes(key) ||
				!Object.hasOwn(parsed, key)
			) {
				throw new UserError(`Unsupported node option: ${node.name}.${key}.`);
			}
		}
		// The existing JSON parser uses the SDK layout for nodes without positions.
		const { position: _position, ...withoutPosition } = parsed;
		return withoutPosition;
	});
	const connections = new Map<string, Map<string, WorkflowJSON['connections'][string][string]>>();
	const seenEdges = new Set<string>();
	for (const { from, to, output = 0, input: targetInput = 0, type = 'main' } of graph.edges) {
		if (!ids.has(from) || !ids.has(to))
			throw new UserError(`Unknown connection node: ${from} -> ${to}.`);
		const key = JSON.stringify([from, to, output, targetInput, type]);
		if (seenEdges.has(key)) throw new UserError(`Duplicate connection: ${from} -> ${to}.`);
		seenEdges.add(key);
		const source =
			connections.get(from) ?? new Map<string, WorkflowJSON['connections'][string][string]>();
		connections.set(from, source);
		const outputs = source.get(type) ?? [];
		source.set(type, outputs);
		while (outputs.length <= output) outputs.push([]);
		const targets = outputs[output] ?? [];
		outputs[output] = targets;
		targets.push({ node: to, type, index: targetInput });
	}
	const groupNames = new Set<string>();
	const nodeGroups = graph.groups?.map(({ name: groupName, nodes: members, description }) => {
		if (groupNames.has(groupName)) throw new UserError(`Duplicate group name: ${groupName}.`);
		groupNames.add(groupName);
		if (new Set(members).size !== members.length)
			throw new UserError(`Duplicate member in group: ${groupName}.`);
		return {
			id: generateDeterministicGroupId(name, groupName),
			name: groupName,
			nodeIds: members.map((member) => {
				const id = ids.get(member);
				if (!id) throw new UserError(`Unknown group member: ${member}.`);
				return id;
			}),
			...(description === undefined ? {} : { description }),
		};
	});
	const result = parseWorkflowJsonSource(
		JSON.stringify({
			name,
			nodes,
			connections: Object.fromEntries(
				[...connections].map(([from, outputs]) => [from, Object.fromEntries(outputs)]),
			),
			nodeGroups,
			settings: graph.settings,
		}),
	);
	if (!result.success) throw new UserError(result.errors.join('\n'));
	return result.workflow;
}
