import type { IConnections, INode } from 'n8n-workflow';

import { rootWorkflow } from '../reachable-nodes';

function node(name: string, type = 'n8n-nodes-base.noOp', extra: Partial<INode> = {}): INode {
	return { id: name, name, type, typeVersion: 1, position: [0, 0], parameters: {}, ...extra };
}

const trigger = node('Trigger', 'n8n-nodes-base.manualTrigger');

const main = (...targets: string[]) => ({
	main: [targets.map((target) => ({ node: target, type: 'main' as const, index: 0 }))],
});

describe('rootWorkflow', () => {
	it.each<{
		case: string;
		nodes: INode[];
		connections: IConnections;
		keptNodes: string[];
		keptSources: string[];
	}>([
		{
			case: 'drops a node that no live trigger reaches, and the connections that leave it',
			nodes: [trigger, node('A'), node('Loose'), node('Child')],
			connections: { Trigger: main('A'), Loose: main('A', 'Child') },
			keptNodes: ['Trigger', 'A'],
			keptSources: ['Trigger'],
		},
		{
			case: 'keeps a disabled node that a trigger reaches, and the nodes behind it',
			nodes: [trigger, node('Off', 'n8n-nodes-base.noOp', { disabled: true }), node('B')],
			connections: { Trigger: main('Off'), Off: main('B') },
			keptNodes: ['Trigger', 'Off', 'B'],
			keptSources: ['Trigger', 'Off'],
		},
		{
			case: 'keeps a non-main connection that leaves a reached node',
			nodes: [trigger, node('Tool'), node('Agent', '@n8n/n8n-nodes-langchain.agent')],
			connections: {
				Trigger: main('Tool'),
				Tool: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
			},
			keptNodes: ['Trigger', 'Tool'],
			keptSources: ['Trigger', 'Tool'],
		},
		{
			case: 'drops the branch of a disabled trigger',
			nodes: [
				trigger,
				node('Chat', '@n8n/n8n-nodes-langchain.chatTrigger', { disabled: true }),
				node('Agent', '@n8n/n8n-nodes-langchain.agent'),
			],
			connections: { Chat: main('Agent') },
			keptNodes: ['Trigger'],
			keptSources: [],
		},
		{
			case: 'keeps every node when the workflow has no live trigger',
			nodes: [node('A'), node('B')],
			connections: { A: main('B') },
			keptNodes: ['A', 'B'],
			keptSources: ['A'],
		},
	])('$case', ({ nodes, connections, keptNodes, keptSources }) => {
		const rooted = rootWorkflow({ nodes, connections, settings: { executionOrder: 'v1' } });

		expect(rooted.nodes.map(({ name }) => name)).toEqual(keptNodes);
		expect(Object.keys(rooted.connections)).toEqual(keptSources);
		expect(rooted.settings).toEqual({ executionOrder: 'v1' });
	});
});
