/**
 * First-class group node (D shape) transforms for the JSON serializer.
 *
 * Forward: a `nodeGroups` array becomes group nodes plus `parentId` on members,
 * with every boundary-crossing connection re-pointed onto the group's own ports.
 *
 * Reverse: group nodes become a `nodeGroups` array again, so `fromJSON` can
 * rebuild the same builder graph a `.group()` call produces.
 *
 * The logic mirrors `migrateNodeGroupsToGroupNodes` in `n8n-workflow`, but it
 * runs on the SDK's `NodeJSON` (whose `name` is optional). Group members and
 * group nodes always carry a name, so the boundary re-point stays name-keyed.
 *
 * See `.agents/specs/group-as-first-class-node.md`.
 */

import { GROUP_NODE_TYPE, normalizeGroupDescription, type IWorkflowGroup } from 'n8n-workflow';

import type { IConnections, NodeJSON } from '../../../types/base';
import { generateDeterministicGroupId } from '../../string-utils';
import type { ResolvedNodeGroup } from '../types';

const MAIN = 'main';

type ConnectionEndpoint = { node: string; type: string; index: number };

function addConnection(
	into: IConnections,
	sourceName: string,
	outputIndex: number,
	connection: ConnectionEndpoint,
): void {
	const bySource = (into[sourceName] ??= {});
	const byType = (bySource[MAIN] ??= []);
	while (byType.length <= outputIndex) byType.push([]);

	const slot = (byType[outputIndex] ??= []);
	const duplicate = slot.some(
		(existing) =>
			existing.node === connection.node &&
			existing.type === connection.type &&
			existing.index === connection.index,
	);
	if (!duplicate) slot.push(connection);
}

/**
 * Rewrites a serialized workflow into the D shape.
 *
 * Every `nodeGroups` entry becomes a group node in `nodes`, its members gain a
 * `parentId`, and every connection that crossed the boundary from a member is
 * re-pointed onto the group's port. An interior edge is left alone.
 *
 * A group whose members are all missing still becomes a group node, as an empty
 * group: losing it would lose the user's work.
 */
export function toGroupNodeShape(
	nodes: NodeJSON[],
	connections: IConnections,
	nodeGroups: readonly ResolvedNodeGroup[],
	workflowId: string | undefined,
	existingGroupIdsByName: ReadonlyMap<string, string> | undefined,
): { nodes: NodeJSON[]; connections: IConnections } {
	if (nodeGroups.length === 0) return { nodes, connections };

	const outNodes = nodes.map((node) => ({ ...node }));
	const nodesById = new Map(outNodes.map((node) => [node.id, node]));
	const takenNames = new Set(outNodes.map((node) => node.name).filter((n): n is string => !!n));

	/** Group node name for each member name, to re-point that member's edges. */
	const groupNameOfMember = new Map<string, string>();
	const groupNodes: NodeJSON[] = [];

	for (const group of nodeGroups) {
		const members = group.memberIds
			.map((id) => nodesById.get(id))
			.filter((member): member is NodeJSON => member !== undefined)
			// A node already inside another group keeps its first group.
			.filter((member) => member.parentId === undefined);

		const name = uniqueName(group.name, takenNames);
		takenNames.add(name);

		// Group id precedence matches the `nodeGroups` path: own id (fromJSON),
		// then a name match, then a deterministic id.
		const id =
			group.id ??
			existingGroupIdsByName?.get(group.name) ??
			generateDeterministicGroupId(workflowId ?? '', group.name);

		const description = normalizeGroupDescription(group.description);
		const position = groupPosition(members);

		groupNodes.push({
			id,
			name,
			type: GROUP_NODE_TYPE,
			typeVersion: 1,
			position,
			parameters: { objective: description ?? '' },
		});

		for (const member of members) {
			member.parentId = id;
			if (member.name !== undefined) groupNameOfMember.set(member.name, name);
		}
	}

	return {
		nodes: [...outNodes, ...groupNodes],
		connections: repointBoundary(connections, groupNameOfMember),
	};
}

/** Re-points every boundary-crossing main edge onto the group's port. */
function repointBoundary(
	connections: IConnections,
	groupNameOfMember: Map<string, string>,
): IConnections {
	const out: IConnections = {};

	for (const [sourceName, outputs] of Object.entries(connections)) {
		for (const [type, outputSlots] of Object.entries(outputs)) {
			if (type !== MAIN) {
				(out[sourceName] ??= {})[type] = outputSlots;
				continue;
			}

			outputSlots.forEach((targets, outputIndex) => {
				for (const target of targets ?? []) {
					const sourceGroup = groupNameOfMember.get(sourceName);
					const targetGroup = groupNameOfMember.get(target.node);

					// Inside one group: unchanged.
					if (sourceGroup !== undefined && sourceGroup === targetGroup) {
						addConnection(out, sourceName, outputIndex, target);
						continue;
					}

					const from = sourceGroup ?? sourceName;
					const to = targetGroup ?? target.node;
					addConnection(out, from, sourceGroup === undefined ? outputIndex : 0, {
						...target,
						node: to,
						index: targetGroup === undefined ? target.index : 0,
					});
				}
			});
		}
	}

	return out;
}

const GROUP_HEADER_OFFSET = 96;
const GROUP_PADDING = 32;

/** Top-left corner for the group node, above and left of its members. */
function groupPosition(members: NodeJSON[]): [number, number] {
	if (members.length === 0) return [0, 0];
	const left = Math.min(...members.map((member) => member.position[0]));
	const top = Math.min(...members.map((member) => member.position[1]));
	return [left - GROUP_PADDING, top - GROUP_HEADER_OFFSET];
}

/** A name no other node uses, so the group node can be addressed by name. */
function uniqueName(preferred: string, taken: Set<string>): string {
	if (!taken.has(preferred)) return preferred;
	let suffix = 1;
	while (taken.has(`${preferred} ${suffix}`)) suffix += 1;
	return `${preferred} ${suffix}`;
}

/** True when the workflow carries at least one first-class group node. */
export function hasGroupNodes(nodes: NodeJSON[]): boolean {
	return nodes.some((node) => node.type === GROUP_NODE_TYPE);
}

/** The interior members (by name) of a group, keyed by the member's own name. */
function interiorNames(nodes: NodeJSON[], groupId: string): Set<string> {
	return new Set(
		nodes
			.filter((node) => node.parentId === groupId && node.name !== undefined)
			.map((node) => node.name as string),
	);
}

/**
 * Rebuilds the `nodeGroups`/interior-edge shape from a D-shaped workflow, so
 * `fromJSON` reconstructs the same builder graph a `.group()` call produces.
 *
 * Each group node becomes a `nodeGroups` entry holding its members by id, the
 * group node is dropped, and every boundary edge is re-pointed from the group's
 * port onto the group's interior entry (incoming) or exit (outgoing) node.
 *
 * The re-point is the inverse of {@link toGroupNodeShape}: an incoming edge
 * `X -> group` becomes `X -> entry`, an outgoing edge `group -> Y` becomes
 * `exit -> Y`. It matches the authored graph `.group()` starts from.
 */
export function fromGroupNodeShape(
	nodes: NodeJSON[],
	connections: IConnections,
): { nodes: NodeJSON[]; connections: IConnections; nodeGroups: IWorkflowGroup[] } {
	const groupNodes = nodes.filter((node) => node.type === GROUP_NODE_TYPE);
	if (groupNodes.length === 0) return { nodes, connections, nodeGroups: [] };

	const nodeGroups: IWorkflowGroup[] = [];
	// group node name -> its interior entry / exit member name, for the re-point.
	const entryOf = new Map<string, string>();
	const exitOf = new Map<string, string>();

	for (const groupNode of groupNodes) {
		if (groupNode.name === undefined) continue;
		const members = nodes.filter((node) => node.parentId === groupNode.id);
		const names = interiorNames(nodes, groupNode.id);

		const fedFromInside = new Set<string>();
		const feedsInside = new Set<string>();
		for (const [from, outputs] of Object.entries(connections)) {
			for (const targets of outputs[MAIN] ?? []) {
				for (const target of targets ?? []) {
					if (names.has(from) && names.has(target.node)) {
						fedFromInside.add(target.node);
						feedsInside.add(from);
					}
				}
			}
		}

		const entry = members.find((member) => member.name && !fedFromInside.has(member.name));
		const exit = members.find((member) => member.name && !feedsInside.has(member.name));
		if (entry?.name) entryOf.set(groupNode.name, entry.name);
		if (exit?.name) exitOf.set(groupNode.name, exit.name);

		const description =
			typeof groupNode.parameters?.objective === 'string'
				? normalizeGroupDescription(groupNode.parameters.objective)
				: undefined;
		nodeGroups.push({
			id: groupNode.id,
			name: groupNode.name,
			nodeIds: members.map((member) => member.id),
			...(description === undefined ? {} : { description }),
		});
	}

	const groupNames = new Set(groupNodes.map((node) => node.name));
	const out: IConnections = {};
	for (const [sourceName, outputs] of Object.entries(connections)) {
		for (const [type, outputSlots] of Object.entries(outputs)) {
			if (type !== MAIN) {
				(out[sourceName] ??= {})[type] = outputSlots;
				continue;
			}
			outputSlots.forEach((targets, outputIndex) => {
				for (const target of targets ?? []) {
					const from = exitOf.get(sourceName) ?? sourceName;
					const to = entryOf.get(target.node) ?? target.node;
					// An edge onto an empty group's port has no interior node to land on.
					if (groupNames.has(from) || groupNames.has(to)) continue;
					addConnection(out, from, outputIndex, { ...target, node: to });
				}
			});
		}
	}

	// The builder carries membership through the group, so members drop `parentId`.
	const outNodes = nodes
		.filter((node) => node.type !== GROUP_NODE_TYPE)
		.map(({ parentId: _parentId, ...node }) => node);

	return { nodes: outNodes, connections: out, nodeGroups };
}
