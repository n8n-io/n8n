import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { RunStateRegistry } from '../../session/run-state-registry';
import type { RunState } from '../../session/session.types';
import type { LookupNodeDescription } from '../../utils/node-filter';
import { createProposeNodesTool, type ResolveNodeVersion } from '../propose-nodes.tool';

const SESSION_ID = 'session-1';

function makeRegistry(): RunStateRegistry {
	const registry = new RunStateRegistry();
	const initial: RunState = {
		sessionId: SESSION_ID,
		projectId: 'proj-1',
		userPrompt: 'build something',
		workflow: { nodes: [], connections: {} },
		requestedInsertionPoint: null,
		connectionContext: null,
		pendingConnectionContext: null,
		taskList: [],
		pendingGhosts: null,
		pendingInsertionPoint: null,
		narrative: [],
		agentState: null,
		pendingResume: null,
		pickedPosition: null,
		autoCommittedPick: null,
		pendingCommit: null,
		done: false,
	};
	registry.create(initial);
	return registry;
}

type ToolHandler = (input: unknown, ctx: unknown) => Promise<unknown>;

function makeDescription(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
	return {
		name: 'n8n-nodes-base.gmail',
		displayName: 'Gmail',
		group: ['transform'],
		version: 2.2,
		description: 'Consume the Gmail API',
		defaults: { name: 'Gmail' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [],
		...overrides,
	} satisfies INodeTypeDescription;
}

describe('propose_nodes tool', () => {
	it('normalizes candidates to the installed current node version before suspending', async () => {
		const registry = makeRegistry();
		const lookup: LookupNodeDescription = jest.fn(() => makeDescription());
		const resolveNodeVersion: ResolveNodeVersion = jest.fn(() => 2.2);
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			lookup,
			resolveNodeVersion,
		) as unknown as { handler: ToolHandler };
		const suspend = jest.fn(async (payload: unknown) => payload);

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'fromStart' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2,
						displayName: 'Gmail',
						reason: 'Read unread email.',
					},
				],
			},
			{ suspend },
		)) as { candidates: Array<{ version: number }> };

		expect(resolveNodeVersion).toHaveBeenCalledWith('n8n-nodes-base.gmail');
		expect(lookup).toHaveBeenCalledWith('n8n-nodes-base.gmail', 2.2);
		expect(result.candidates[0].version).toBe(2.2);
		expect(registry.require(SESSION_ID).pendingGhosts?.[0]?.version).toBe(2.2);
		expect(suspend).toHaveBeenCalledWith({
			candidates: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					version: 2.2,
					displayName: 'Gmail',
					parameters: {},
					reason: 'Read unread email.',
				},
			],
			insertionPoint: { kind: 'fromStart' },
		});
	});

	it('rejects unknown node types before they can become ghosts', async () => {
		const registry = makeRegistry();
		const lookup: LookupNodeDescription = jest.fn(() => null);
		const resolveNodeVersion: ResolveNodeVersion = jest.fn(() => null);
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			lookup,
			resolveNodeVersion,
		) as unknown as { handler: ToolHandler };
		const suspend = jest.fn(async (payload: unknown) => payload);

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'fromStart' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.notARealNode',
						version: 1,
						displayName: 'Unknown',
						reason: 'Mistaken id.',
					},
				],
			},
			{ suspend },
		)) as { error?: string; rejected?: Array<{ nodeType: string }> };

		expect(result.error).toBe('unknown-node-type');
		expect(result.rejected?.[0]?.nodeType).toBe('n8n-nodes-base.notARealNode');
		expect(suspend).not.toHaveBeenCalled();
		expect(registry.require(SESSION_ID).pendingGhosts).toBeNull();
	});

	it('filters unknown node types out of mixed proposals', async () => {
		const registry = makeRegistry();
		const lookup: LookupNodeDescription = jest.fn((nodeType) =>
			nodeType === 'n8n-nodes-base.gmail' ? makeDescription() : null,
		);
		const resolveNodeVersion: ResolveNodeVersion = jest.fn((nodeType) =>
			nodeType === 'n8n-nodes-base.gmail' ? 2.2 : null,
		);
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			lookup,
			resolveNodeVersion,
		) as unknown as { handler: ToolHandler };
		const suspend = jest.fn(async (payload: unknown) => payload);

		await tool.handler(
			{
				insertionPoint: { kind: 'fromStart' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.notARealNode',
						version: 1,
						displayName: 'Unknown',
						reason: 'Mistaken id.',
					},
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2,
						displayName: 'Gmail',
						reason: 'Read unread email.',
					},
				],
			},
			{ suspend },
		);

		expect(registry.require(SESSION_ID).pendingGhosts).toEqual([
			{
				nodeType: 'n8n-nodes-base.gmail',
				version: 2.2,
				displayName: 'Gmail',
				parameters: {},
				reason: 'Read unread email.',
			},
		]);
	});

	it('allows another node of the same type when the display name is purpose-specific', async () => {
		const registry = makeRegistry();
		const existingNode: INode = {
			id: 'gmail-read-node',
			name: 'Gmail - Read unread emails',
			type: 'n8n-nodes-base.gmail',
			typeVersion: 2.2,
			position: [250, 300],
			parameters: { operation: 'getAll' },
		};
		registry.update(SESSION_ID, {
			workflow: { nodes: [existingNode], connections: {} },
		});
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			() => makeDescription(),
			() => 2.2,
		) as unknown as { handler: ToolHandler };
		const suspend = jest.fn(async (payload: unknown) => payload);

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'after', afterNodeId: existingNode.id },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2,
						displayName: 'Gmail - Send action summary',
						reason: 'Send the generated summary by email.',
					},
				],
			},
			{ suspend },
		)) as { candidates: Array<{ nodeType: string; displayName: string }> };

		expect(result.candidates).toEqual([
			expect.objectContaining({
				nodeType: 'n8n-nodes-base.gmail',
				displayName: 'Gmail - Send action summary',
			}),
		]);
		expect(registry.require(SESSION_ID).pendingGhosts?.[0]?.displayName).toBe(
			'Gmail - Send action summary',
		);
		expect(suspend).toHaveBeenCalled();
	});

	it('rejects candidates whose display name already exists on the canvas', async () => {
		const registry = makeRegistry();
		registry.update(SESSION_ID, {
			workflow: {
				nodes: [
					{
						id: 'gmail-read-node',
						name: 'Gmail - Read unread emails',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.2,
						position: [250, 300],
						parameters: { operation: 'getAll' },
					},
				],
				connections: {},
			},
		});
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			() => makeDescription(),
			() => 2.2,
		) as unknown as { handler: ToolHandler };
		const suspend = jest.fn(async (payload: unknown) => payload);

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'fromStart' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2,
						displayName: 'Gmail - Read unread emails',
						reason: 'Send a summary email.',
					},
				],
			},
			{ suspend },
		)) as {
			error?: string;
			rejected?: Array<{ displayName: string }>;
			hint?: string;
		};

		expect(result.error).toBe('duplicate-display-name');
		expect(result.rejected?.[0]?.displayName).toBe('Gmail - Read unread emails');
		expect(result.hint).toContain('same nodeType is allowed');
		expect(suspend).not.toHaveBeenCalled();
		expect(registry.require(SESSION_ID).pendingGhosts).toBeNull();
	});

	it('uses the normalized candidate when creating pendingCommit on pick resume', async () => {
		const registry = makeRegistry();
		registry.update(SESSION_ID, {
			pendingGhosts: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					version: 2.2,
					displayName: 'Gmail',
					reason: 'Read unread email.',
					parameters: {
						resource: 'message',
						operation: 'getAll',
					},
				},
			],
			pendingInsertionPoint: { kind: 'fromStart' },
		});
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			() => makeDescription(),
			() => 2.2,
		) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				insertionPoint: { kind: 'fromStart' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2,
						displayName: 'Gmail',
						reason: 'Read unread email.',
						parameters: {},
					},
				],
			},
			{ resumeData: { kind: 'pick', chosenIndex: 0 } },
		);

		expect(registry.require(SESSION_ID).pendingCommit).toMatchObject({
			nodeType: 'n8n-nodes-base.gmail',
			version: 2.2,
			displayName: 'Gmail',
			parameters: {
				resource: 'message',
				operation: 'getAll',
			},
			insertionPoint: { kind: 'fromStart' },
			connectionContext: null,
		});
	});

	it('returns an auto-committed pick without creating pendingCommit', async () => {
		const registry = makeRegistry();
		registry.update(SESSION_ID, {
			pendingGhosts: [
				{
					nodeType: 'n8n-nodes-base.gmail',
					version: 2.2,
					displayName: 'Gmail',
					reason: 'Read unread email.',
				},
			],
			pendingInsertionPoint: { kind: 'fromStart' },
			autoCommittedPick: {
				nodeId: 'committed-node-id',
				name: 'Gmail',
				missing: { params: [], credentials: [] },
				workflowSummary: '- Gmail (committed-node-id): n8n-nodes-base.gmail@2.2',
			},
		});
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			() => makeDescription(),
			() => 2.2,
		) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'fromStart' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2.2,
						displayName: 'Gmail',
						reason: 'Read unread email.',
					},
				],
			},
			{ resumeData: { kind: 'pick', chosenIndex: 0 } },
		)) as { committed?: { nodeId: string }; hint?: string };

		expect(result.committed?.nodeId).toBe('committed-node-id');
		expect(result.hint).toContain('already been committed');
		expect(registry.require(SESSION_ID).pendingCommit).toBeNull();
		expect(registry.require(SESSION_ID).autoCommittedPick).toBeNull();
	});

	it('allows compatible AI sub-nodes when adding from a non-main input handle', async () => {
		const registry = makeRegistry();
		registry.update(SESSION_ID, {
			connectionContext: {
				nodeId: 'agent-node-id',
				mode: 'inputs',
				type: NodeConnectionTypes.AiLanguageModel,
				index: 0,
			},
		});
		const lookup: LookupNodeDescription = jest.fn(() =>
			makeDescription({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				inputs: [],
				outputs: [NodeConnectionTypes.AiLanguageModel],
			}),
		);
		const tool = createProposeNodesTool(registry, SESSION_ID, lookup, () => 1) as unknown as {
			handler: ToolHandler;
		};
		const suspend = jest.fn(async (payload: unknown) => payload);

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
				candidates: [
					{
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						displayName: 'OpenAI Chat Model',
						reason: 'Provide the agent language model input.',
					},
				],
			},
			{ suspend },
		)) as { candidates: Array<{ nodeType: string }> };

		expect(result.candidates).toEqual([
			expect.objectContaining({
				nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			}),
		]);
		expect(suspend).toHaveBeenCalled();
	});

	it('rejects candidates that cannot connect to the requested handle type', async () => {
		const registry = makeRegistry();
		registry.update(SESSION_ID, {
			connectionContext: {
				nodeId: 'agent-node-id',
				mode: 'inputs',
				type: NodeConnectionTypes.AiLanguageModel,
				index: 0,
			},
		});
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			() => makeDescription(),
			() => 2.2,
		) as unknown as { handler: ToolHandler };
		const suspend = jest.fn(async (payload: unknown) => payload);

		const result = (await tool.handler(
			{
				insertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
				candidates: [
					{
						nodeType: 'n8n-nodes-base.gmail',
						version: 2,
						displayName: 'Gmail',
						reason: 'Read unread email.',
					},
				],
			},
			{ suspend },
		)) as { error?: string; rejected?: Array<{ nodeType: string }> };

		expect(result.error).toBe('incompatible-connection-type');
		expect(result.rejected?.[0]?.nodeType).toBe('n8n-nodes-base.gmail');
		expect(suspend).not.toHaveBeenCalled();
		expect(registry.require(SESSION_ID).pendingGhosts).toBeNull();
	});

	it('carries the connection context into pendingCommit after a pick', async () => {
		const registry = makeRegistry();
		const connectionContext: RunState['connectionContext'] = {
			nodeId: 'agent-node-id',
			mode: 'inputs',
			type: NodeConnectionTypes.AiLanguageModel,
			index: 0,
		};
		registry.update(SESSION_ID, {
			connectionContext,
			pendingGhosts: [
				{
					nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
					version: 1,
					displayName: 'OpenAI Chat Model',
					reason: 'Provide the agent language model input.',
				},
			],
			pendingInsertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
		});
		const tool = createProposeNodesTool(
			registry,
			SESSION_ID,
			() =>
				makeDescription({
					outputs: [NodeConnectionTypes.AiLanguageModel],
				}),
			() => 1,
		) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				insertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
				candidates: [
					{
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						displayName: 'OpenAI Chat Model',
						reason: 'Provide the agent language model input.',
					},
				],
			},
			{ resumeData: { kind: 'pick', chosenIndex: 0 } },
		);

		expect(registry.require(SESSION_ID).pendingCommit).toMatchObject({
			connectionContext,
		});
	});

	it('allows agent-supplied AI support connection context in full-workflow mode', async () => {
		const registry = makeRegistry();
		const connectionContext: NonNullable<RunState['connectionContext']> = {
			nodeId: 'agent-node-id',
			mode: 'inputs',
			type: NodeConnectionTypes.AiLanguageModel,
			index: 0,
		};
		const lookup: LookupNodeDescription = jest.fn(() =>
			makeDescription({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				inputs: [],
				outputs: [NodeConnectionTypes.AiLanguageModel],
			}),
		);
		const tool = createProposeNodesTool(registry, SESSION_ID, lookup, () => 1) as unknown as {
			handler: ToolHandler;
		};
		const suspend = jest.fn(async (payload: unknown) => payload);

		await tool.handler(
			{
				insertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
				connectionContext,
				candidates: [
					{
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						displayName: 'OpenAI Chat Model',
						reason: 'Provides the required language model connection.',
					},
				],
			},
			{ suspend },
		);

		expect(registry.require(SESSION_ID).pendingConnectionContext).toEqual(connectionContext);

		await tool.handler(
			{
				insertionPoint: { kind: 'after', afterNodeId: 'agent-node-id' },
				connectionContext,
				candidates: [
					{
						nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						version: 1,
						displayName: 'OpenAI Chat Model',
						reason: 'Provides the required language model connection.',
					},
				],
			},
			{ resumeData: { kind: 'pick', chosenIndex: 0 } },
		);

		expect(registry.require(SESSION_ID).pendingCommit).toMatchObject({
			connectionContext,
		});
	});
});
