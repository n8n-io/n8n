import { NodeConnectionTypes, type INode, type INodeTypeDescription } from 'n8n-workflow';

import { RunStateRegistry } from '../../session/run-state-registry';
import type { RunState } from '../../session/session.types';
import type { LookupNodeDescription } from '../../utils/node-filter';
import { createCommitNodeTool } from '../commit-node.tool';

const SESSION_ID = 'session-1';

/**
 * Build a registry whose run state is seeded with a `pendingCommit` so
 * `commit_node`'s authorization gate (1a) lets the test commit through.
 * Tests that want to exercise the gate explicitly can override / clear
 * the pendingCommit on the registry after the call.
 */
type PendingCommitSeed =
	| (Omit<NonNullable<RunState['pendingCommit']>, 'connectionContext'> & {
			connectionContext?: NonNullable<RunState['pendingCommit']>['connectionContext'];
	  })
	| null;

function makeRegistry(
	pending: PendingCommitSeed = {
		nodeType: 'n8n-nodes-base.scheduleTrigger',
		version: 1,
		displayName: 'Schedule Trigger',
		insertionPoint: { kind: 'fromStart' },
		connectionContext: null,
	},
): RunStateRegistry {
	const pendingCommit = pending
		? { ...pending, connectionContext: pending.connectionContext ?? null }
		: null;
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
		pendingCommit,
		done: false,
	};
	registry.create(initial);
	return registry;
}

type ToolHandler = (input: unknown, ctx: unknown) => Promise<unknown>;

function getHandler(lookup: LookupNodeDescription): ToolHandler {
	// `BuiltTool.handler` is the runtime entry point used by the agent SDK.
	const tool = createCommitNodeTool(makeRegistry(), SESSION_ID, lookup) as unknown as {
		handler: ToolHandler;
	};
	return tool.handler;
}

function makeDescription(overrides: Partial<INodeTypeDescription>): INodeTypeDescription {
	return { properties: [], credentials: [], ...overrides } as unknown as INodeTypeDescription;
}

describe('commit_node tool', () => {
	it('embeds a workflow summary in the result', async () => {
		const registry = makeRegistry();
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{
				nodeType: 'n8n-nodes-base.scheduleTrigger',
				version: 1,
				displayName: 'Schedule Trigger',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		)) as { workflowSummary: string; nodeId: string };

		expect(result.nodeId).toBeTruthy();
		expect(result.workflowSummary).toContain('Schedule Trigger');
		expect(result.workflowSummary).toContain('n8n-nodes-base.scheduleTrigger@1');
	});

	it('rejects commit when description shows required params but parameters are empty', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.httpRequest',
			version: 4,
			displayName: 'HTTP Request',
			insertionPoint: { kind: 'fromStart' },
		});
		const lookup: LookupNodeDescription = () =>
			makeDescription({
				properties: [
					{
						displayName: 'URL',
						name: 'url',
						type: 'string',
						required: true,
						default: '',
					},
				],
			});
		const tool = createCommitNodeTool(registry, SESSION_ID, lookup) as unknown as {
			handler: ToolHandler;
		};

		const result = (await tool.handler(
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				version: 4,
				displayName: 'HTTP Request',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		)) as { error?: string; missing?: string[] };

		expect(result.error).toBe('missing-required-params');
		expect(result.missing).toEqual(['url']);
		// Workflow should still be empty — nothing was committed.
		expect(registry.require(SESSION_ID).workflow.nodes).toHaveLength(0);
	});

	it('commits with non-empty parameters even when other required fields are missing, and surfaces them', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.googleSheets',
			version: 4,
			displayName: 'Google Sheets',
			insertionPoint: { kind: 'fromStart' },
		});
		const lookup: LookupNodeDescription = () =>
			makeDescription({
				properties: [
					{
						displayName: 'Spreadsheet',
						name: 'spreadsheet',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Sheet Name',
						name: 'sheetName',
						type: 'string',
						required: true,
						default: '',
					},
				],
				credentials: [{ name: 'googleApi', displayName: 'Google account', required: true }],
			});
		const tool = createCommitNodeTool(registry, SESSION_ID, lookup) as unknown as {
			handler: ToolHandler;
		};

		const result = (await tool.handler(
			{
				nodeType: 'n8n-nodes-base.googleSheets',
				version: 4,
				displayName: 'Google Sheets',
				parameters: { spreadsheet: null },
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		)) as {
			nodeId: string;
			missing: { params: Array<{ path: string }>; credentials: Array<{ name: string }> };
		};

		expect(result.nodeId).toBeTruthy();
		expect(result.missing.params.map((p) => p.path)).toEqual(['spreadsheet', 'sheetName']);
		expect(result.missing.credentials.map((c) => c.name)).toEqual(['googleApi']);

		const state = registry.require(SESSION_ID);
		expect(state.workflow.nodes).toHaveLength(1);
		// The narrative should now contain the surface-missing chat line.
		expect(state.narrative.length).toBeGreaterThan(0);
		const last = state.narrative[state.narrative.length - 1];
		expect(last.role).toBe('assistant');
		expect(last.content).toContain('Spreadsheet');
		expect(last.content).toContain('Sheet Name');
		expect(last.content).toContain('Google account');
	});

	it('commits cleanly with no missing-fields narrative when the node has nothing required', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.set',
			version: 1,
			displayName: 'Set',
			insertionPoint: { kind: 'fromStart' },
		});
		const lookup: LookupNodeDescription = () =>
			makeDescription({ properties: [], credentials: [] });
		const tool = createCommitNodeTool(registry, SESSION_ID, lookup) as unknown as {
			handler: ToolHandler;
		};

		await tool.handler(
			{
				nodeType: 'n8n-nodes-base.set',
				version: 1,
				displayName: 'Set',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		const state = registry.require(SESSION_ID);
		expect(state.workflow.nodes).toHaveLength(1);
		expect(state.narrative).toHaveLength(0);
	});

	it('rejects commit when no pendingCommit is set', async () => {
		const registry = makeRegistry(null);
		const tool = createCommitNodeTool(
			registry,
			SESSION_ID,
			(() => null) as LookupNodeDescription,
		) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{
				nodeType: 'n8n-nodes-base.scheduleTrigger',
				version: 1,
				displayName: 'Schedule Trigger',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		)) as { error?: string };

		expect(result.error).toBe('no-pending-pick');
		expect(registry.require(SESSION_ID).workflow.nodes).toHaveLength(0);
	});

	it('rejects commit when nodeType/version differs from pendingCommit', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.scheduleTrigger',
			version: 1,
			displayName: 'Schedule Trigger',
			insertionPoint: { kind: 'fromStart' },
		});
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				version: 4,
				displayName: 'HTTP Request',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		)) as { error?: string; expected?: { nodeType: string } };

		expect(result.error).toBe('commit-mismatch');
		expect(result.expected?.nodeType).toBe('n8n-nodes-base.scheduleTrigger');
		expect(registry.require(SESSION_ID).workflow.nodes).toHaveLength(0);
	});

	it('rejects commit when the picked node is not recognized', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.notARealNode',
			version: 1,
			displayName: 'Unknown',
			insertionPoint: { kind: 'fromStart' },
		});
		const tool = createCommitNodeTool(
			registry,
			SESSION_ID,
			(() => null) as LookupNodeDescription,
		) as unknown as { handler: ToolHandler };

		const result = (await tool.handler(
			{
				nodeType: 'n8n-nodes-base.notARealNode',
				version: 1,
				displayName: 'Unknown',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		)) as { error?: string };

		expect(result.error).toBe('unknown-or-invalid-node');
		expect(registry.require(SESSION_ID).workflow.nodes).toHaveLength(0);
	});

	it('uses the picked ghost name, position, and insertion point for the commit', async () => {
		const sourceNode: INode = {
			id: 'source-node-id',
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.set',
			version: 1,
			displayName: 'Set from ghost',
			insertionPoint: { kind: 'after', afterNodeId: sourceNode.id },
			position: [470, 300],
		});
		registry.update(SESSION_ID, {
			workflow: { nodes: [sourceNode], connections: {} },
			pickedPosition: [470, 300],
		});
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				nodeType: 'n8n-nodes-base.set',
				version: 1,
				displayName: 'Agent-supplied name',
				parameters: {},
				position: [999, 999],
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		const state = registry.require(SESSION_ID);
		const committed = state.workflow.nodes[1];
		expect(committed.name).toBe('Set from ghost');
		expect(committed.position).toEqual([470, 300]);
		expect(state.workflow.connections['Schedule Trigger']?.main?.[0]?.[0]?.node).toBe(
			'Set from ghost',
		);
	});

	it('commits the parameters that were shown on the picked ghost', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.gmail',
			version: 2.2,
			displayName: 'Gmail - Send summary',
			parameters: {
				resource: 'message',
				operation: 'send',
			},
			insertionPoint: { kind: 'fromStart' },
		});
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				nodeType: 'n8n-nodes-base.gmail',
				version: 2.2,
				displayName: 'Agent-supplied name',
				parameters: {
					resource: 'message',
					operation: 'getAll',
				},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		expect(registry.require(SESSION_ID).workflow.nodes[0]?.parameters).toEqual({
			resource: 'message',
			operation: 'send',
		});
	});

	it('falls back to a unique node name if the picked name already exists', async () => {
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.gmail',
			version: 2.2,
			displayName: 'Gmail',
			insertionPoint: { kind: 'fromStart' },
		});
		registry.update(SESSION_ID, {
			workflow: {
				nodes: [
					{
						id: 'existing-gmail',
						name: 'Gmail',
						type: 'n8n-nodes-base.gmail',
						typeVersion: 2.2,
						position: [250, 300],
						parameters: { operation: 'getAll' },
					},
				],
				connections: {},
			},
		});
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				nodeType: 'n8n-nodes-base.gmail',
				version: 2.2,
				displayName: 'Gmail',
				parameters: { operation: 'send' },
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		const state = registry.require(SESSION_ID);
		expect(state.workflow.nodes).toHaveLength(2);
		expect(state.workflow.nodes[1].name).toBe('Gmail 1');
	});

	it('connects a picked AI sub-node into the requested input handle', async () => {
		const agentNode: INode = {
			id: 'agent-node-id',
			name: 'AI Agent',
			type: '@n8n/n8n-nodes-langchain.agent',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};
		const registry = makeRegistry({
			nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			displayName: 'OpenAI Chat Model',
			insertionPoint: { kind: 'after', afterNodeId: agentNode.id },
			connectionContext: {
				nodeId: agentNode.id,
				mode: 'inputs',
				type: NodeConnectionTypes.AiLanguageModel,
				index: 0,
			},
		});
		registry.update(SESSION_ID, {
			workflow: { nodes: [agentNode], connections: {} },
		});
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1,
				displayName: 'Agent-supplied name',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		const state = registry.require(SESSION_ID);
		expect(
			state.workflow.connections['OpenAI Chat Model']?.[NodeConnectionTypes.AiLanguageModel]?.[0],
		).toEqual([{ node: 'AI Agent', type: NodeConnectionTypes.AiLanguageModel, index: 0 }]);
	});

	it('inserts a picked node between an existing output connection and its target', async () => {
		const sourceNode: INode = {
			id: 'source-node-id',
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1,
			position: [250, 300],
			parameters: {},
		};
		const targetNode: INode = {
			id: 'target-node-id',
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [690, 300],
			parameters: {},
		};
		const registry = makeRegistry({
			nodeType: 'n8n-nodes-base.httpRequest',
			version: 4,
			displayName: 'HTTP Request',
			insertionPoint: { kind: 'after', afterNodeId: sourceNode.id },
			connectionContext: {
				nodeId: sourceNode.id,
				mode: 'outputs',
				type: NodeConnectionTypes.Main,
				index: 0,
				targetNodeId: targetNode.id,
				targetType: NodeConnectionTypes.Main,
				targetIndex: 0,
			},
		});
		registry.update(SESSION_ID, {
			workflow: {
				nodes: [sourceNode, targetNode],
				connections: {
					'Schedule Trigger': {
						main: [[{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 }]],
					},
				},
			},
		});
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				version: 4,
				displayName: 'Agent-supplied name',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		const state = registry.require(SESSION_ID);
		expect(state.workflow.connections['Schedule Trigger']?.main?.[0]).toEqual([
			{ node: 'HTTP Request', type: NodeConnectionTypes.Main, index: 0 },
		]);
		expect(state.workflow.connections['HTTP Request']?.main?.[0]).toEqual([
			{ node: 'Edit Fields', type: NodeConnectionTypes.Main, index: 0 },
		]);
	});

	it('clears pendingCommit on successful commit', async () => {
		const registry = makeRegistry();
		const tool = createCommitNodeTool(registry, SESSION_ID, (() =>
			makeDescription({
				properties: [],
				credentials: [],
			})) as LookupNodeDescription) as unknown as { handler: ToolHandler };

		await tool.handler(
			{
				nodeType: 'n8n-nodes-base.scheduleTrigger',
				version: 1,
				displayName: 'Schedule Trigger',
				parameters: {},
				insertionPoint: { kind: 'fromStart' },
			},
			{},
		);

		expect(registry.require(SESSION_ID).pendingCommit).toBeNull();
		expect(registry.require(SESSION_ID).workflow.nodes).toHaveLength(1);
	});

	void getHandler; // retained for symmetry / future helpers
});
