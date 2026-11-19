import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { randomUUID } from 'node:crypto';
import { AGENT_LANGCHAIN_NODE_TYPE, type IConnections, type INode } from 'n8n-workflow';

import { FALLBACK_NODE_NAME } from './agent-determinism.constants';
import type { DeterminismSource } from './agent-determinism.contracts';

export type FallbackBranch = {
	nodes: NodeJSON[];
	connections: WorkflowJSON['connections'];
	entryNodeName: string;
};

const FALLBACK_POSITION: [number, number] = [0, 600];

export function buildAgentFallback(source: DeterminismSource): FallbackBranch {
	return {
		entryNodeName: FALLBACK_NODE_NAME,
		connections: {},
		nodes: [
			{
				id: randomUUID(),
				name: FALLBACK_NODE_NAME,
				type: 'n8n-nodes-base.messageAnAgent',
				typeVersion: 3.1,
				position: FALLBACK_POSITION,
				parameters: {
					agentId: { __rl: true, mode: 'id', value: source.id },
					message: '={{ JSON.stringify($json) }}',
				},
			},
		],
	};
}

export function buildWorkflowFallback(source: {
	nodes: INode[];
	connections: IConnections;
}): FallbackBranch {
	const agent = source.nodes.find((node) => node.type === AGENT_LANGCHAIN_NODE_TYPE);
	if (!agent) throw new Error('The source workflow has no Agent node');

	const renamed = (name: string) =>
		name === agent.name ? FALLBACK_NODE_NAME : `Fallback: ${name}`;
	const subNodes = source.nodes.filter((node) =>
		Object.entries(source.connections[node.name] ?? {}).some(
			([type, branches]) =>
				type !== 'main' && branches.flat().some((connection) => connection?.node === agent.name),
		),
	);

	const connections: WorkflowJSON['connections'] = {};
	for (const node of subNodes) {
		connections[renamed(node.name)] = Object.fromEntries(
			Object.entries(source.connections[node.name] ?? {})
				.filter(([type]) => type !== 'main')
				.map(([type, branches]) => [
					type,
					branches.map((branch) =>
						(branch ?? []).map((connection) => ({ ...connection, node: renamed(connection.node) })),
					),
				]),
		);
	}

	const nodes = [agent, ...subNodes].map((node, index) => ({
		...node,
		id: randomUUID(),
		name: renamed(node.name),
		position: [
			FALLBACK_POSITION[0] + index * 200,
			FALLBACK_POSITION[1] + (index === 0 ? 0 : 200),
		] as [number, number],
	}));

	return { nodes, connections, entryNodeName: FALLBACK_NODE_NAME };
}
