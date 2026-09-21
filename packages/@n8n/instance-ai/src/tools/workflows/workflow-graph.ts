import {
	generateDeterministicGroupId,
	generateDeterministicNodeId,
	type WorkflowJSON,
} from '@n8n/workflow-sdk';
import {
	GROUP_DESCRIPTION_MAX_LENGTH,
	INodeSchema,
	NodeConnectionTypeSchema,
	UserError,
	type INodeTypes,
} from 'n8n-workflow';
import { z } from 'zod';

import { parseWorkflowJsonSource } from './workflow-source-compiler';
import { addWorkflowGraphParameterIds } from './workflow-graph-parameter-ids';
import type { BuildPlanSelection } from '../../workflow-builder/build-plan-review';

const graphNodeFields = {
	name: z.string().min(1),
	parameters: z
		.record(z.unknown())
		.describe(
			'Node parameters. Omit row IDs in assignment and filter collections. Code fills them from the installed node schema.',
		),
	options: z
		.record(z.unknown())
		.optional()
		.describe(
			'Optional node settings, such as alwaysOutputData, onError, retryOnFail, maxTries, notes, or existing credential references. Do not include id, name, type, typeVersion, parameters, or position.',
		),
};

export const workflowGraphSchema = z
	.object({
		planId: z
			.string()
			.min(1)
			.optional()
			.describe(
				'Latest planId from plan-build. Required for nodes that reference a selected step.',
			),
		nodes: z
			.array(
				z.union([
					z
						.object({
							...graphNodeFields,
							type: z.string().min(1),
							typeVersion: z.number().positive(),
						})
						.strict(),
					z
						.object({
							...graphNodeFields,
							step: z
								.string()
								.min(1)
								.describe(
									'Step id with a selected operation from plan-build. Code supplies its type, version, and operation fields.',
								),
						})
						.strict(),
				]),
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
						description: z.string().max(GROUP_DESCRIPTION_MAX_LENGTH).optional(),
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
	selections: BuildPlanSelection[] = [],
	nodeTypes?: INodeTypes,
): WorkflowJSON {
	const graph = workflowGraphSchema.parse(input);
	const selectedSteps = new Map(selections.map((selection) => [selection.id, selection]));
	const ids = new Map<string, string>();
	const nodes = graph.nodes.map(({ options, ...supplied }) => {
		let node;
		if ('step' in supplied) {
			const selected = graph.planId ? selectedSteps.get(supplied.step) : undefined;
			if (!selected)
				throw new UserError(
					`No accepted plan selection for step: ${supplied.step}. Use explicit type and typeVersion after resolving the choice.`,
				);
			const { resource, operation, mode } = selected;
			const parameters = Object.fromEntries(
				Object.entries({ resource, operation, mode }).filter(([, value]) => value !== undefined),
			);
			for (const [key, value] of Object.entries(parameters)) {
				if (Object.hasOwn(supplied.parameters, key) && supplied.parameters[key] !== value) {
					throw new UserError(
						`Node ${supplied.name} changes the selected ${key}. Use an explicit node type and version for a different operation.`,
					);
				}
			}
			node = {
				name: supplied.name,
				type: selected.nodeType,
				typeVersion: selected.version,
				parameters: { ...parameters, ...supplied.parameters },
			};
		} else node = supplied;
		if (ids.has(node.name)) throw new UserError(`Duplicate node name: ${node.name}.`);
		const id = generateDeterministicNodeId(name, node.type, node.name);
		ids.set(node.name, id);
		if (nodeTypes) {
			const { properties } = nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
			node.parameters = addWorkflowGraphParameterIds(id, node.parameters, properties);
		}
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
