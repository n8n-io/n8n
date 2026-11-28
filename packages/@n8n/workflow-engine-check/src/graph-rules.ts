import {
	NodeConnectionTypes,
	getChildNodes,
	isTriggerNodeType,
	type IConnections,
	type INode,
} from 'n8n-workflow';

import { findStronglyConnectedComponents } from './strongly-connected-components';
import { makeReason } from './reason';
import type { EngineV2Reason, EngineV2ReasonCode, EngineV2ReasonKind } from './types';

const SPLIT_IN_BATCHES_TYPE = 'n8n-nodes-base.splitInBatches';

interface Edge {
	from: string;
	to: string;
	outputIndex: number;
	inputIndex: number;
}

type MakeReason = (
	code: EngineV2ReasonCode,
	kind: EngineV2ReasonKind,
	problem: string,
	nodeName?: string,
	severity?: EngineV2Reason['severity'],
) => EngineV2Reason;

interface Loop {
	loopNode: string;
	members: Set<string>;
	returns: Edge[];
}

/**
 * Mirrors the loop detection of `V1WorkflowConverter` and the graph rules of
 * `validateExecutableGraph`, for the graph that each live trigger starts. With no live
 * trigger the converter does not root the graph, so the rules see every node.
 */
export function findGraphReasons(nodes: INode[], connections: IConnections): EngineV2Reason[] {
	const nodesByName = new Map(nodes.map((node) => [node.name, node]));
	const liveTriggers = nodes.filter(
		(node) => node.disabled !== true && isTriggerNodeType(node.type),
	);
	const roots = liveTriggers.length > 0 ? liveTriggers : [undefined];
	const reasonsByKey = new Map<string, EngineV2Reason>();
	for (const trigger of roots) {
		for (const reason of findReasonsForTrigger(nodes, nodesByName, connections, trigger)) {
			reasonsByKey.set(`${reason.code}|${reason.message}`, reason);
		}
	}
	return [...reasonsByKey.values()];
}

function findReasonsForTrigger(
	nodes: INode[],
	nodesByName: Map<string, INode>,
	connections: IConnections,
	trigger: INode | undefined,
): EngineV2Reason[] {
	const reason: MakeReason = (code, kind, problem, nodeName, severity) =>
		makeReason({
			code,
			kind,
			problem,
			node: nodeName === undefined ? undefined : nodesByName.get(nodeName),
			severity,
		});
	const isLoopNode = (name: string) => nodesByName.get(name)?.type === SPLIT_IN_BATCHES_TYPE;

	const { liveNodes, edges } = toRootedGraph(nodes, connections, trigger);
	const loops: Loop[] = [];
	const returns = new Set<Edge>();

	// Like the converter: mark each loop's returns, cut them, and look again for the loops inside.
	let remaining = edges;
	for (let outermost = true; ; outermost = false) {
		const successors = new Map<string, string[]>();
		for (const e of remaining) {
			const list = successors.get(e.from);
			if (list) list.push(e.to);
			else successors.set(e.from, [e.to]);
		}
		const cycles = findStronglyConnectedComponents(
			liveNodes,
			(name) => successors.get(name) ?? [],
		).filter((members) => members.length > 1 || successors.get(members[0])?.includes(members[0]));
		if (cycles.length === 0) break;

		const reasons: EngineV2Reason[] = [];
		for (const memberList of cycles) {
			const members = new Set(memberList);
			const loopNodes = memberList.filter(isLoopNode);
			const entered = new Set(
				remaining.filter((e) => members.has(e.to) && !members.has(e.from)).map((e) => e.to),
			);
			const midBodyEntry = [...entered].find((name) => !isLoopNode(name));
			const entries = entered.size > 0 ? [...entered] : loopNodes;

			if (loopNodes.length === 0) {
				const [first] = memberList
					.map((name) => nodesByName.get(name)!)
					.sort((a, b) => a.position[1] - b.position[1] || a.position[0] - b.position[0]);
				reasons.push(
					reason(
						'CYCLE_WITHOUT_SPLIT_IN_BATCHES',
						'temporary',
						`"${first.name}" is part of a cycle without a Split In Batches node. Engine v2 does not support cycles without a Split In Batches node yet.`,
						first.name,
					),
				);
			} else if (midBodyEntry !== undefined) {
				reasons.push(
					reason(
						'LOOP_ENTERED_MID_BODY',
						'permanent',
						`A connection enters the loop at "${midBodyEntry}". Engine v2 needs every loop to start at its Split In Batches node. Connect it to the Split In Batches node instead.`,
						midBodyEntry,
					),
				);
			} else if (entries.length !== 1) {
				reasons.push(
					reason(
						'LOOP_MULTIPLE_ENTRIES',
						'temporary',
						`The loop through ${quote(entries)} has more than one Split In Batches node where it starts. Engine v2 does not support this yet.`,
						entries[0],
					),
				);
			} else {
				const loopReturns = remaining.filter((e) => e.to === entries[0] && members.has(e.from));
				for (const edge of loopReturns) returns.add(edge);
				if (outermost) loops.push({ loopNode: entries[0], members, returns: loopReturns });
			}
		}
		// The converter stops at the first loop it cannot read, so the rules below would guess.
		if (reasons.length > 0) return reasons;
		remaining = remaining.filter((edge) => !returns.has(edge));
	}

	const returnedTo = new Set([...returns].map((edge) => edge.to));
	const withoutReturn = liveNodes.filter((name) => isLoopNode(name) && !returnedTo.has(name));

	return [
		...withoutReturn.map((name) =>
			reason(
				'LOOP_WITHOUT_RETURN',
				'permanent',
				`No connection returns to "${name}". Engine v2 runs a Split In Batches node only as a loop, so connect the end of the loop back to it.`,
				name,
			),
		),
		...loops.flatMap((loop) => findLoopShapeReasons(loop, edges, returnedTo, reason)),
		// Without a trigger the start node is unknown, so the check cannot tell which nodes are cut off.
		...(trigger === undefined ? [] : findCutOffReasons(trigger.name, edges, reason)),
		...findInputSlotReasons(edges, returns, new Set(loops.map((loop) => loop.loopNode)), reason),
	];
}

/** The engine's rules for one loop, found on the whole graph, so an inner loop is part of the outer one. */
function findLoopShapeReasons(
	{ loopNode, members, returns }: Loop,
	edges: Edge[],
	returnedTo: Set<string>,
	reason: MakeReason,
): EngineV2Reason[] {
	const reasons: EngineV2Reason[] = [];

	// An inner Split In Batches node without a return gets LOOP_WITHOUT_RETURN instead.
	for (const inner of [...members].filter((name) => name !== loopNode && returnedTo.has(name))) {
		reasons.push(
			reason(
				'NESTED_LOOP',
				'temporary',
				`The loop of "${inner}" is inside the loop of "${loopNode}". Engine v2 does not support nested loops yet.`,
				inner,
			),
		);
	}

	if (returns.length > 1) {
		reasons.push(
			reason(
				'LOOP_MULTIPLE_RETURNS',
				'temporary',
				`${returns.length} connections return to "${loopNode}". Engine v2 does not support more than one return connection for a loop yet.`,
				loopNode,
			),
		);
	}

	const entries = edges.filter((e) => e.to === loopNode && !members.has(e.from));
	if (entries.length > 1) {
		reasons.push(
			reason(
				'LOOP_MULTIPLE_ENTRIES',
				'temporary',
				`${entries.length} connections enter the loop of "${loopNode}". Engine v2 does not support more than one connection into a loop yet.`,
				loopNode,
			),
		);
	}

	if (edges.some((e) => e.to === loopNode && e.inputIndex !== 0)) {
		reasons.push(
			reason(
				'LOOP_INPUT_NOT_FIRST',
				'permanent',
				`A connection goes into an input of "${loopNode}" other than the first. Engine v2 needs every connection into a Split In Batches node to use its first input. Connect it to the first input.`,
				loopNode,
			),
		);
	}

	if (edges.some((e) => e.from === loopNode && e.outputIndex > 1)) {
		reasons.push(
			reason(
				'LOOP_OUTPUT_NOT_DONE_OR_LOOP',
				'invalid',
				`A connection leaves "${loopNode}" from an output other than done and loop. A Split In Batches node has only these two outputs. Remove the connection.`,
				loopNode,
			),
		);
	}

	if (edges.some((e) => e.from === loopNode && e.outputIndex === 0 && members.has(e.to))) {
		reasons.push(
			reason(
				'LOOP_DONE_OUTPUT_FEEDS_BODY',
				'permanent',
				`The done output of "${loopNode}" connects to a node inside its own loop. A node cannot run both in each pass and after the loop. Connect the done output to a node after the loop.`,
				loopNode,
			),
		);
	}

	const exits = edges.filter(
		(e) =>
			members.has(e.from) && !members.has(e.to) && (e.from !== loopNode || e.outputIndex === 1),
	);
	for (const from of new Set(exits.map((e) => e.from))) {
		reasons.push(
			reason(
				'LOOP_EXITS_MID_BODY',
				'temporary',
				`"${from}" connects to a node outside the loop of "${loopNode}". Engine v2 does not support a way out of the loop other than the done output of "${loopNode}" yet.`,
				from,
			),
		);
	}

	return reasons;
}

/**
 * A node that the trigger reaches only through a later input of a disabled node loses
 * its way in when the disabled node is bypassed. Engine v2 then waits for it forever.
 */
function findCutOffReasons(
	triggerName: string,
	edges: Edge[],
	reason: MakeReason,
): EngineV2Reason[] {
	const reached = new Set([triggerName]);
	for (let grew = true; grew; ) {
		grew = false;
		for (const edge of edges) {
			if (reached.has(edge.from) && !reached.has(edge.to)) {
				reached.add(edge.to);
				grew = true;
			}
		}
	}

	const cutOff = edges.filter((e) => reached.has(e.to) && !reached.has(e.from));
	return [...new Set(cutOff.map((e) => e.from))].map((name) =>
		reason(
			'NODE_REACHED_ONLY_THROUGH_DISABLED_NODE',
			'invalid',
			`"${name}" gets data only through an input of a disabled node other than the first. Engine v2 would wait for it forever. Enable the disabled node, or connect "${name}" another way.`,
			name,
		),
	);
}

/** Entries into a loop node are left to `LOOP_MULTIPLE_ENTRIES`, so one shape gives one reason. */
function findInputSlotReasons(
	edges: Edge[],
	returns: Set<Edge>,
	loopNodes: Set<string>,
	reason: MakeReason,
): EngineV2Reason[] {
	const countBySlot = new Map<string, { to: string; inputIndex: number; count: number }>();
	for (const edge of edges.filter((e) => !returns.has(e) && !loopNodes.has(e.to))) {
		const key = `${edge.to}#${edge.inputIndex}`;
		const slot = countBySlot.get(key) ?? { to: edge.to, inputIndex: edge.inputIndex, count: 0 };
		slot.count += 1;
		countBySlot.set(key, slot);
	}

	return [...countBySlot.values()]
		.filter((slot) => slot.count > 1)
		.map((slot) =>
			reason(
				'INPUT_SLOT_CONVERGENCE',
				'permanent',
				`${slot.count} connections go into input ${slot.inputIndex + 1} of "${slot.to}". Engine v2 runs "${slot.to}" once, on the items of all these connections together. Items arrive in the order of the connected nodes on the canvas: top to bottom, then left to right. Engine v1 runs it once for each connection that sends items. A node that works on all its items at once, such as Aggregate, can give a different result. To keep the engine v1 result, give each connection its own copy of "${slot.to}".`,
				slot.to,
				'warning',
			),
		);
}

/**
 * The `main` edges between live nodes that the trigger reaches, or between all live nodes
 * when there is no trigger, as the converter builds them: an edge through a disabled node
 * joins the edges into its first input to the edges out of it, and duplicate edges count once.
 */
function toRootedGraph(
	nodes: INode[],
	connections: IConnections,
	trigger: INode | undefined,
): { liveNodes: string[]; edges: Edge[] } {
	let rooted = nodes;
	if (trigger !== undefined) {
		const reachable = new Set([
			trigger.name,
			...getChildNodes(connections, trigger.name, NodeConnectionTypes.Main, -1),
		]);
		rooted = nodes.filter((node) => reachable.has(node.name));
	}
	const names = new Set(rooted.map((node) => node.name));

	let edges: Edge[] = [];
	for (const [from, byType] of Object.entries(connections).filter(([from]) => names.has(from))) {
		(byType.main ?? []).forEach((slot, outputIndex) => {
			for (const connection of slot ?? []) {
				if (names.has(connection.node) && connection.type === NodeConnectionTypes.Main) {
					edges.push({ from, to: connection.node, outputIndex, inputIndex: connection.index });
				}
			}
		});
	}
	edges = dedupe(edges);

	for (const disabled of rooted.filter((node) => node.disabled === true).map((node) => node.name)) {
		const into = edges.filter(
			(e) => e.to === disabled && e.from !== disabled && e.inputIndex === 0,
		);
		const outOf = edges.filter((e) => e.from === disabled && e.to !== disabled);
		const bypass = into.flatMap((i) =>
			outOf.map((o) => ({
				from: i.from,
				to: o.to,
				outputIndex: i.outputIndex,
				inputIndex: o.inputIndex,
			})),
		);
		edges = dedupe(edges.filter((e) => e.from !== disabled && e.to !== disabled).concat(bypass));
	}

	const liveNodes = rooted.filter((node) => node.disabled !== true).map((node) => node.name);
	return { liveNodes, edges };
}

function dedupe(edges: Edge[]): Edge[] {
	const byKey = new Map<string, Edge>();
	for (const e of edges) byKey.set(JSON.stringify([e.from, e.to, e.outputIndex, e.inputIndex]), e);
	return [...byKey.values()];
}

function quote(names: string[]): string {
	return names.map((name) => `"${name}"`).join(', ');
}
