import { createPinia, setActivePinia } from 'pinia';
import { nextTick, shallowRef } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NodeConnectionTypes, type IConnection, type IConnections, type INode } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { syncDocStore, useBuilderV2DocSync } from '../useBuilderV2DocSync';
import { builderV2GhostId } from '../../utils/ghostIds';
import { useBuilderV2Store } from '../../stores/builder-v2.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn(() => ({
		restApiContext: { baseUrl: 'http://localhost:5678', sessionId: '' },
	})),
}));

class FakeDocumentStore {
	constructor(public workflowId = 'workflow-1') {}

	allNodes: INodeUi[] = [];

	connectionsBySourceNode: IConnections = {};

	getNodeById(id: string): INodeUi | undefined {
		return this.allNodes.find((node) => node.id === id);
	}

	addNode(node: INodeUi): void {
		this.allNodes.push(node);
	}

	removeNodeById(id: string): void {
		this.allNodes = this.allNodes.filter((node) => node.id !== id);
	}

	removeAllNodeConnection(node: INodeUi): void {
		delete this.connectionsBySourceNode[node.name];
		for (const sourceName of Object.keys(this.connectionsBySourceNode)) {
			for (const connectionType of Object.keys(this.connectionsBySourceNode[sourceName])) {
				const typedConnections = this.connectionsBySourceNode[sourceName][connectionType];
				for (const outputIndex of Object.keys(typedConnections)) {
					const connections = typedConnections[Number(outputIndex)];
					if (!connections) continue;
					typedConnections[Number(outputIndex)] = connections.filter(
						(connection) => connection.node !== node.name,
					);
				}
			}
		}
	}

	setConnections(connections: IConnections): void {
		this.connectionsBySourceNode = connections;
	}

	addConnection(data: { connection: IConnection[] }): void {
		const [source, destination] = data.connection;
		if (!source || !destination) return;
		this.connectionsBySourceNode[source.node] ??= {};
		this.connectionsBySourceNode[source.node][source.type] ??= [];
		this.connectionsBySourceNode[source.node][source.type][source.index] ??= [];
		const connections = this.connectionsBySourceNode[source.node][source.type][source.index];
		if (!connections) return;
		if (
			connections.some(
				(connection) =>
					connection.node === destination.node &&
					connection.type === destination.type &&
					connection.index === destination.index,
			)
		) {
			return;
		}
		connections.push(destination);
	}
}

function makeNode(overrides: Partial<INodeUi>): INodeUi {
	return {
		id: 'node-id',
		name: 'Node',
		type: 'n8n-nodes-base.set',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
		...overrides,
	};
}

describe('useBuilderV2DocSync', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('does not hydrate stale builder state into another workflow document', async () => {
		const builderStore = useBuilderV2Store();
		builderStore.activeWorkflowId = 'workflow-1';
		builderStore.sessionId = 'session-1';
		builderStore.ghosts = [
			{
				nodeType: 'n8n-nodes-base.gmail',
				version: 2.2,
				displayName: 'Gmail',
				reason: 'Read recent email.',
			},
		];
		builderStore.workflow = {
			nodes: [
				makeNode({
					id: 'committed-gmail-id',
					name: 'Gmail',
					type: 'n8n-nodes-base.gmail',
					typeVersion: 2.2,
				}),
			],
			connections: {},
		};

		const doc = new FakeDocumentStore('workflow-2');
		doc.addNode(
			makeNode({
				id: builderV2GhostId('session-1', 0),
				name: 'Gmail',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.2,
				placeholder: true,
				placeholderKind: 'ghost',
				builderV2GhostIndex: 0,
			}),
		);

		const syncedDoc = shallowRef(
			doc as unknown as Parameters<typeof useBuilderV2DocSync>[0]['value'],
		);
		const { stop } = useBuilderV2DocSync(syncedDoc);
		await nextTick();
		stop();

		expect(doc.allNodes).toEqual([]);
	});

	it('asks the canvas to center the first ghost in an empty workflow', async () => {
		const builderStore = useBuilderV2Store();
		builderStore.activeWorkflowId = 'workflow-1';
		builderStore.sessionId = 'session-1';
		builderStore.ghosts = [
			{
				nodeType: 'n8n-nodes-base.scheduleTrigger',
				version: 1,
				displayName: 'Schedule Trigger',
				reason: 'Start the workflow.',
			},
		];
		builderStore.workflow = { nodes: [], connections: {} };

		const doc = new FakeDocumentStore('workflow-1');
		const eventBus = { emit: vi.fn() };
		const syncedDoc = shallowRef(
			doc as unknown as Parameters<typeof useBuilderV2DocSync>[0]['value'],
		);
		const { stop } = useBuilderV2DocSync(
			syncedDoc,
			eventBus as unknown as Parameters<typeof useBuilderV2DocSync>[1],
		);
		await nextTick();
		stop();

		expect(eventBus.emit).toHaveBeenCalledWith('nodes:select', {
			ids: [builderV2GhostId('session-1', 0)],
			centerIntoView: true,
		});
	});
});

describe('syncDocStore', () => {
	it('replaces a stale optimistic ghost when the next proposal reuses the same ghost id', () => {
		const doc = new FakeDocumentStore();
		const sessionId = 'session-1';
		doc.addNode(
			makeNode({
				id: builderV2GhostId(sessionId, 0),
				name: 'Gmail',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.2,
				placeholder: false,
				placeholderKind: undefined,
				builderV2GhostIndex: undefined,
			}),
		);

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: 'n8n-nodes-base.set',
					version: 3.4,
					displayName: 'Edit Fields',
					reason: 'Shape the email data.',
				},
			],
			insertionPoint: { kind: 'fromStart' },
			connectionContext: null,
			committedNodes: [],
			committedConnections: {},
		});

		expect(doc.allNodes).toHaveLength(1);
		expect(doc.allNodes[0]).toMatchObject({
			id: builderV2GhostId(sessionId, 0),
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			placeholder: true,
			placeholderKind: 'ghost',
			builderV2GhostIndex: 0,
		});
	});

	it('writes proposed parameters onto ghost nodes', () => {
		const doc = new FakeDocumentStore();
		const sessionId = 'session-1';

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					version: 2.2,
					displayName: 'Gmail - Send summary',
					reason: 'Send the generated summary.',
					parameters: {
						resource: 'message',
						operation: 'send',
					},
				},
			],
			insertionPoint: { kind: 'fromStart' },
			connectionContext: null,
			committedNodes: [],
			committedConnections: {},
		});

		expect(doc.allNodes[0]?.parameters).toEqual({
			resource: 'message',
			operation: 'send',
		});
	});

	it('updates an existing ghost when the proposed parameters change', () => {
		const doc = new FakeDocumentStore();
		const sessionId = 'session-1';

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					version: 2.2,
					displayName: 'Gmail - Send summary',
					reason: 'Send the generated summary.',
					parameters: {
						resource: 'message',
						operation: 'getAll',
					},
				},
			],
			insertionPoint: { kind: 'fromStart' },
			connectionContext: null,
			committedNodes: [],
			committedConnections: {},
		});

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					version: 2.2,
					displayName: 'Gmail - Send summary',
					reason: 'Send the generated summary.',
					parameters: {
						resource: 'message',
						operation: 'send',
					},
				},
			],
			insertionPoint: { kind: 'fromStart' },
			connectionContext: null,
			committedNodes: [],
			committedConnections: {},
		});

		expect(doc.allNodes).toHaveLength(1);
		expect(doc.allNodes[0]?.parameters).toEqual({
			resource: 'message',
			operation: 'send',
		});
	});

	it('restores backend connections after replacing a stale ghost-name collision', () => {
		const doc = new FakeDocumentStore();
		const sessionId = 'session-1';
		const scheduleNode = makeNode({
			id: 'schedule-id',
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.3,
			position: [0, 0],
		});
		const gmailNode: INode = {
			id: 'gmail-id',
			name: 'Gmail',
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.2,
			position: [220, 0],
			parameters: {},
		};
		doc.addNode(scheduleNode);
		doc.addNode(
			makeNode({
				id: builderV2GhostId(sessionId, 0),
				name: 'Gmail',
				type: 'n8n-nodes-base.gmail',
				typeVersion: 2.2,
				placeholder: false,
				placeholderKind: undefined,
				builderV2GhostIndex: undefined,
				position: [220, 0],
			}),
		);
		doc.setConnections({
			'Schedule Trigger': {
				main: [[{ node: 'Gmail', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		});

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: 'n8n-nodes-base.set',
					version: 3.4,
					displayName: 'Edit Fields',
					reason: 'Shape the email data.',
				},
			],
			insertionPoint: { kind: 'after', afterNodeId: gmailNode.id },
			connectionContext: null,
			committedNodes: [scheduleNode, gmailNode],
			committedConnections: {
				'Schedule Trigger': {
					main: [[{ node: 'Gmail', type: NodeConnectionTypes.Main, index: 0 }]],
				},
			},
		});

		expect(doc.connectionsBySourceNode['Schedule Trigger']?.main?.[0]).toEqual([
			{ node: 'Gmail', type: NodeConnectionTypes.Main, index: 0 },
		]);
		expect(doc.connectionsBySourceNode.Gmail?.main?.[0]).toEqual([
			{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 },
		]);
	});

	it('adds a preview connection from a compatible AI sub-node ghost into an input handle', () => {
		const doc = new FakeDocumentStore();
		const sessionId = 'session-1';
		doc.addNode(
			makeNode({
				id: 'agent-node-id',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [250, 300],
			}),
		);

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					version: 1,
					displayName: 'OpenAI Chat Model',
					reason: 'Provide the agent language model input.',
				},
			],
			insertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
			connectionContext: {
				nodeId: 'agent-node-id',
				mode: 'inputs',
				type: NodeConnectionTypes.AiLanguageModel,
				index: 0,
			},
			committedNodes: [],
			committedConnections: {},
		});

		expect(
			doc.connectionsBySourceNode['OpenAI Chat Model']?.[NodeConnectionTypes.AiLanguageModel]?.[0],
		).toEqual([{ node: 'AI Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }]);
	});

	it('previews insertion between an output handle and its existing target', () => {
		const doc = new FakeDocumentStore();
		const sessionId = 'session-1';
		doc.addNode(
			makeNode({
				id: 'source-node-id',
				name: 'Schedule Trigger',
				type: 'n8n-nodes-base.scheduleTrigger',
				typeVersion: 1,
				position: [250, 300],
			}),
		);
		doc.addNode(
			makeNode({
				id: 'target-node-id',
				name: 'Edit Fields',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [690, 300],
			}),
		);

		syncDocStore({
			doc: doc as unknown as Parameters<typeof syncDocStore>[0]['doc'],
			sessionId,
			ghosts: [
				{
					nodeType: 'n8n-nodes-base.httpRequest',
					version: 4,
					displayName: 'HTTP Request',
					reason: 'Fetch data before shaping it.',
				},
			],
			insertionPoint: { kind: 'after', afterNodeId: 'source-node-id' },
			connectionContext: {
				nodeId: 'source-node-id',
				mode: 'outputs',
				type: NodeConnectionTypes.Main,
				index: 0,
				targetNodeId: 'target-node-id',
				targetType: NodeConnectionTypes.Main,
				targetIndex: 0,
			},
			committedNodes: [],
			committedConnections: {},
		});

		expect(doc.connectionsBySourceNode['Schedule Trigger']?.main?.[0]).toEqual([
			{ node: 'HTTP Request', type: NodeConnectionTypes.Main, index: 0 },
		]);
		expect(doc.connectionsBySourceNode['HTTP Request']?.main?.[0]).toEqual([
			{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 },
		]);
	});
});
