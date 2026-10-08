import { classifyMcpTool } from '@n8n/ai-utilities/agent-config';
import type {
	AgentJsonConfig,
	AgentJsonMcpServerConfig,
	AgentJsonNodeToolConfig,
	AgentJsonToolConfig,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import {
	getChildNodes,
	getReachableNodeNames,
	mapConnectionsByDestination,
	STICKY_NODE_TYPE,
	type IConnections,
	type INode,
} from 'n8n-workflow';

/**
 * Pure checks for the software factory template pack. They hold no knowledge of the pack
 * itself, so that unit tests can prove them on small graphs and configs.
 */

export interface WorkflowGraph {
	nodes: INode[];
	connections: IConnections;
}

export interface Edge {
	source: string;
	type: string;
	outputIndex: number;
	target: string;
}

/** Selects outputs by source node name and output index. */
export type OutputSelector = (source: string, outputIndex: number) => boolean;

export function listEdges(connections: IConnections): Edge[] {
	return Object.entries(connections).flatMap(([source, byType]) =>
		Object.entries(byType).flatMap(([type, outputs]) =>
			outputs.flatMap((targets, outputIndex) =>
				(targets ?? []).map((target) => ({ source, type, outputIndex, target: target.node })),
			),
		),
	);
}

const describeEdge = (edge: Edge) =>
	`${edge.source} -[${edge.type} ${edge.outputIndex}]-> ${edge.target}`;

/** Connections whose source or target is not a node of the workflow. */
export function findDanglingConnections({ nodes, connections }: WorkflowGraph): string[] {
	const names = new Set(nodes.map((node) => node.name));
	return listEdges(connections)
		.filter((edge) => !names.has(edge.source) || !names.has(edge.target))
		.map(describeEdge);
}

/** A copy of the connections without the outputs that `drop` selects. */
export function withoutOutputs(connections: IConnections, drop: OutputSelector): IConnections {
	const result: IConnections = {};
	for (const [source, byType] of Object.entries(connections)) {
		result[source] = {};
		for (const [type, outputs] of Object.entries(byType)) {
			result[source][type] = outputs.map((targets, outputIndex) =>
				drop(source, outputIndex) ? [] : [...(targets ?? [])],
			);
		}
	}
	return result;
}

/** Names of the nodes that no trigger reaches. Sticky notes are not part of the flow. */
export function findUnreachableNodes(
	{ nodes, connections }: WorkflowGraph,
	isTrigger: (node: INode) => boolean,
): string[] {
	const reachable = getReachableNodeNames(
		nodes,
		connections,
		mapConnectionsByDestination(connections),
		isTrigger,
	);
	return nodes
		.filter((node) => node.type !== STICKY_NODE_TYPE && !reachable.has(node.name))
		.map((node) => node.name);
}

/**
 * The sorted node names of each cycle that stays when the `isBreaker` outputs are removed. A
 * node that connects to itself is a cycle of one.
 */
export function findUnboundedCycles(
	{ nodes, connections }: WorkflowGraph,
	isBreaker: OutputSelector,
): string[][] {
	const remaining = withoutOutputs(connections, isBreaker);
	// getChildNodes never lists the start node, so a self-loop needs its own check.
	const selfLoops = new Set(
		listEdges(remaining)
			.filter((edge) => edge.source === edge.target)
			.map((edge) => edge.source),
	);
	const descendants = new Map(
		nodes.map((node) => [node.name, new Set(getChildNodes(remaining, node.name))]),
	);
	const reaches = (from: string, to: string) => descendants.get(from)?.has(to) ?? false;

	const cycles: string[][] = [];
	const assigned = new Set<string>();
	for (const { name } of nodes) {
		if (assigned.has(name)) continue;
		const loop = [...(descendants.get(name) ?? [])].filter((other) => reaches(other, name));
		if (loop.length === 0 && !selfLoops.has(name)) continue;
		const cycle = [name, ...loop].sort();
		for (const member of cycle) assigned.add(member);
		cycles.push(cycle);
	}
	return cycles;
}

const RUN_INDEX_EXPRESSION = /^=\{\{\s*\$runIndex\s*\}\}$/;

/** The number of runs that one `{{ $runIndex }} < N` (or `<= N`) condition lets through. */
function runIndexConditionLimit(condition: unknown): number | undefined {
	if (!isRecord(condition) || !isRecord(condition.operator)) return undefined;
	const { leftValue, rightValue, operator } = condition;
	if (typeof leftValue !== 'string' || !RUN_INDEX_EXPRESSION.test(leftValue)) return undefined;
	if (operator.type !== 'number' || typeof rightValue !== 'number') return undefined;
	if (!Number.isFinite(rightValue)) return undefined;
	if (operator.operation === 'lt') return Math.max(Math.ceil(rightValue), 0);
	if (operator.operation === 'lte') return Math.max(Math.floor(rightValue) + 1, 0);
	return undefined;
}

/**
 * How many runs a filter value (If conditions or a Switch rule) lets pass because of a
 * `$runIndex` limit, or undefined when nothing limits it. Only an "and" filter can limit.
 */
export function runIndexLimit(filterValue: unknown): number | undefined {
	if (!isRecord(filterValue) || !Array.isArray(filterValue.conditions)) return undefined;
	if (filterValue.combinator !== 'and') return undefined;
	const limits = filterValue.conditions
		.map(runIndexConditionLimit)
		.filter((limit): limit is number => limit !== undefined);
	return limits.length > 0 ? Math.min(...limits) : undefined;
}

/** The `$runIndex` limit of one output of an If or Switch (rules mode) node. */
export function outputRunIndexLimit(node: INode, outputIndex: number): number | undefined {
	if (node.type === 'n8n-nodes-base.if') {
		return outputIndex === 0 ? runIndexLimit(node.parameters.conditions) : undefined;
	}
	const rules: unknown = node.parameters.rules;
	if (node.type !== 'n8n-nodes-base.switch' || !isRecord(rules)) return undefined;
	const rule: unknown = Array.isArray(rules.values) ? rules.values[outputIndex] : undefined;
	return isRecord(rule) ? runIndexLimit(rule.conditions) : undefined;
}

const canWrite = (name: string) => classifyMcpTool({ name }) === 'write';

function nodeToolWriteReason(tool: AgentJsonNodeToolConfig): string | undefined {
	if (tool.requireApproval) return `tool "${tool.name}" needs approval, so it changes data`;
	const operation = tool.node.nodeParameters?.operation;
	if (typeof operation !== 'string') {
		return `tool "${tool.name}" has no operation that shows it only reads`;
	}
	return canWrite(operation) ? `tool "${tool.name}" runs "${operation}"` : undefined;
}

function toolWriteReason(tool: AgentJsonToolConfig): string | undefined {
	switch (tool.type) {
		case 'custom':
			return `custom tool "${tool.id}" runs code that the config does not show`;
		case 'workflow':
			return `workflow tool "${tool.name ?? tool.workflow}" can change data`;
		case 'node':
			return nodeToolWriteReason(tool);
	}
}

function mcpServerWriteReasons(server: AgentJsonMcpServerConfig): string[] {
	if (server.toolFilter?.mode !== 'allow') {
		return [`MCP server "${server.name}" has no allow list, so it offers every tool`];
	}
	return server.toolFilter.tools
		.filter(canWrite)
		.map((tool) => `MCP server "${server.name}" offers "${tool}"`);
}

/** Capabilities that can change data whatever their settings are. */
function capabilityWriteReasons(config: AgentJsonConfig): string[] {
	const reasons = [
		config.coding ? 'coding lets the agent change a repository' : undefined,
		config.subAgents?.agents?.some((agent) => agent.enabled !== false)
			? 'sub-agents can have write tools'
			: undefined,
		config.integrations?.length ? 'integrations let the agent send messages' : undefined,
		Object.keys(config.providerTools ?? {}).length > 0
			? 'provider tools are not classified'
			: undefined,
	];
	return reasons.filter((reason): reason is string => reason !== undefined);
}

/**
 * Why an agent can change something. The list is empty only when each enabled capability is
 * known to be read-only. Unknown capabilities count as write access (fail closed).
 */
export function findWriteAccess(config: AgentJsonConfig): string[] {
	const toolReasons = (config.tools ?? [])
		.filter((tool) => tool.enabled !== false)
		.map(toolWriteReason)
		.filter((reason): reason is string => reason !== undefined);
	return [
		...capabilityWriteReasons(config),
		...toolReasons,
		...(config.mcpServers ?? []).flatMap(mcpServerWriteReasons),
	];
}
