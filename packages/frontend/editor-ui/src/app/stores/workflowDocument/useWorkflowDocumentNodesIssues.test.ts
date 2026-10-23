import { describe, it, expect } from 'vitest';
import { computed, shallowRef } from 'vue';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import type { IConnections, INodeConnections } from 'n8n-workflow';
import {
	useWorkflowDocumentNodesIssues,
	type WorkflowDocumentNodesIssuesDeps,
} from './useWorkflowDocumentNodesIssues';

const connectedNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({ name: 'Node', ...overrides }) as INodeUi;

/** `createTestNode` takes a `Partial<INode>`, which has no `issues`. */
const nodeWithIssues = (name: string, issues: INodeUi['issues']): INodeUi =>
	createTestNode({ name, ...{ issues } }) as INodeUi;

const hasConnections: () => INodeConnections = () => ({
	main: [[{ node: 'Other', type: 'main' as const, index: 0 }]],
});
const noConnections: () => INodeConnections = () => ({});
/** What the canvas leaves behind after the last link of a type is deleted. */
const emptyConnectionEntry: () => INodeConnections = () => ({ ai_outputParser: [[]] });
/** And the same with the output slot nulled out rather than emptied. */
const nulledConnectionEntry: () => INodeConnections = () => ({ ai_outputParser: [null] });

type DepOverrides = Partial<WorkflowDocumentNodesIssuesDeps>;

function createDeps(
	nodes: INodeUi[],
	connected = true,
	overrides: DepOverrides = {},
): WorkflowDocumentNodesIssuesDeps {
	return {
		allNodes: computed(() => nodes),
		outgoingConnectionsByNodeName: connected ? hasConnections : noConnections,
		incomingConnectionsByNodeName: noConnections,
		connectionsBySourceNode: computed<IConnections>(() => ({})),
		connectionsByDestinationNode: computed<IConnections>(() => ({})),
		// Default: everything is a trigger, so every node is reachable and the
		// per-issue-kind rules are what the assertions actually exercise.
		isTriggerLike: () => true,
		canOutputMain: () => true,
		nodesById: shallowRef(new Map(nodes.map((n) => [n.id, n]))),
		onNodesChange: () => {},
		nodeIssuesToString: () => [],
		...overrides,
	};
}

/** Trigger -> Agent over `main`, with `subNode` supplying the agent over `ai_outputParser`. */
function subNodeGraph({ agentDisabled = false } = {}) {
	const trigger = createTestNode({ name: 'Trigger', type: 'n8n-nodes-base.scheduleTrigger' });
	const agent = createTestNode({
		name: 'Agent',
		type: '@n8n/n8n-nodes-langchain.agent',
		disabled: agentDisabled,
	});
	const subNode = nodeWithIssues('Parser', {
		input: { ai_languageModel: ['Model input is not connected'] },
	});

	const connectionsBySourceNode: IConnections = {
		Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
		Parser: { ai_outputParser: [[{ node: 'Agent', type: 'ai_outputParser', index: 0 }]] },
	};
	const connectionsByDestinationNode: IConnections = {
		Agent: {
			main: [[{ node: 'Trigger', type: 'main', index: 0 }]],
			ai_outputParser: [[{ node: 'Parser', type: 'ai_outputParser', index: 0 }]],
		},
	};

	return {
		nodes: [trigger, agent, subNode] as INodeUi[],
		overrides: {
			connectionsBySourceNode: computed(() => connectionsBySourceNode),
			connectionsByDestinationNode: computed(() => connectionsByDestinationNode),
			isTriggerLike: (node: INodeUi) => node.name === 'Trigger',
			// Only the agent sits on the main path; the parser just supplies it.
			canOutputMain: (node: INodeUi) => node.name !== 'Parser',
		} satisfies DepOverrides,
	};
}

describe('useWorkflowDocumentNodesIssues', () => {
	describe('nodeValidationIssues', () => {
		// Feeds the assistant's build todos, which still ask whether a node is wired
		// to anything rather than whether a run can reach it.
		it('includes a connected node with parameter issues', () => {
			const node = connectedNode({ issues: { parameters: { param1: ['Missing value'] } } });
			const { nodeValidationIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(nodeValidationIssues.value.length).toBeGreaterThan(0);
		});

		it.each([
			['an output slot with no endpoints', emptyConnectionEntry],
			['an output slot that is null', nulledConnectionEntry],
		])('skips a node left with %s', (_label, connections) => {
			const node = connectedNode({ issues: { parameters: { param1: ['Missing value'] } } });
			const { nodeValidationIssues } = useWorkflowDocumentNodesIssues({
				...createDeps([node]),
				outgoingConnectionsByNodeName: connections,
			});

			expect(nodeValidationIssues.value).toEqual([]);
		});
	});

	describe('hasPublishBlockingIssues', () => {
		it('does not count execution issues as publish-blocking', () => {
			const node = connectedNode({ issues: { execution: true } });
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(false);
		});

		it('counts parameter issues as publish-blocking', () => {
			const node = connectedNode({
				issues: { parameters: { param1: ['Missing value'] } },
			});
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(true);
		});

		it('counts credential issues as publish-blocking', () => {
			const node = connectedNode({
				issues: { credentials: { cred1: ['Not set'] } },
			});
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(true);
		});

		it('blocks on parameter issues even when execution issues are also present', () => {
			const node = connectedNode({
				issues: { execution: true, parameters: { param1: ['Missing value'] } },
			});
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(createDeps([node]));

			expect(hasPublishBlockingIssues.value).toBe(true);
		});

		it('does not block on a node no trigger can reach', () => {
			// Wired to another node, so connectedness would call it live, but there is
			// no trigger anywhere in the graph.
			const island = nodeWithIssues('Island Parser', {
				input: { ai_languageModel: ['Model input is not connected'] },
			});
			const neighbour = createTestNode({ name: 'Island Agent' }) as INodeUi;

			const connections: IConnections = {
				'Island Parser': {
					ai_outputParser: [[{ node: 'Island Agent', type: 'ai_outputParser', index: 0 }]],
				},
			};

			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(
				createDeps([island, neighbour], true, {
					connectionsBySourceNode: computed(() => connections),
					connectionsByDestinationNode: computed<IConnections>(() => ({
						'Island Agent': {
							ai_outputParser: [[{ node: 'Island Parser', type: 'ai_outputParser', index: 0 }]],
						},
					})),
					isTriggerLike: () => false,
				}),
			);

			expect(hasPublishBlockingIssues.value).toBe(false);
		});

		it('blocks on an unmet input when the node it supplies runs', () => {
			const { nodes, overrides } = subNodeGraph();
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(
				createDeps(nodes, true, overrides),
			);

			expect(hasPublishBlockingIssues.value).toBe(true);
		});

		it('does not block on an unmet input when the only node it supplies is disabled', () => {
			const { nodes, overrides } = subNodeGraph({ agentDisabled: true });
			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(
				createDeps(nodes, true, overrides),
			);

			expect(hasPublishBlockingIssues.value).toBe(false);
		});

		it('still blocks on a credential issue behind a disabled consumer', () => {
			// The inert-subnode exemption is for unmet inputs only. A credential is the
			// node's own problem, and the server blocks on it, so the button must too.
			const { nodes, overrides } = subNodeGraph({ agentDisabled: true });
			const parser = nodes.find((node) => node.name === 'Parser') as INodeUi;
			parser.issues = { credentials: { cred1: ['Not set'] } };

			const { hasPublishBlockingIssues } = useWorkflowDocumentNodesIssues(
				createDeps(nodes, true, overrides),
			);

			expect(hasPublishBlockingIssues.value).toBe(true);
		});
	});

	describe('publishBlockingNodes', () => {
		it('lists only the nodes that block, so the count matches the button', () => {
			const { nodes, overrides } = subNodeGraph();
			const unreachable = nodeWithIssues('Lone Parser', {
				input: { ai_languageModel: ['Model input is not connected'] },
			});

			const { publishBlockingNodes } = useWorkflowDocumentNodesIssues(
				createDeps([...nodes, unreachable], true, overrides),
			);

			expect(publishBlockingNodes.value.map((node) => node.name)).toEqual(['Parser']);
		});
	});
});
