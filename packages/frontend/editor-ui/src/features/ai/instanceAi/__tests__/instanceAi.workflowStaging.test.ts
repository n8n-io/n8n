import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';

import {
	getWorkflowStaging,
	isStagingDraft,
	toStagingNodeTypeInfo,
	toStagingWorkflowNodes,
	type WorkflowStaging,
} from '../instanceAi.workflowStaging';

let callCount = 0;

function call(
	toolName: string,
	args: Record<string, unknown> = {},
	overrides: Partial<InstanceAiToolCallState> = {},
): InstanceAiToolCallState {
	callCount += 1;
	return {
		toolCallId: `tc-${callCount}`,
		toolName,
		args,
		isLoading: false,
		result: {},
		...overrides,
	};
}

function tree(
	toolCalls: InstanceAiToolCallState[],
	children: InstanceAiAgentNode[] = [],
): InstanceAiAgentNode {
	return {
		runId: 'run-1',
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls,
		children,
		timeline: [],
	};
}

const loadBuilder = () => call('load_skill', { name: 'workflow-builder' });
const KNOWN_TYPES = new Set(['n8n-nodes-base.gmail', 'n8n-nodes-base.slack', 'n8n-nodes-base.set']);
const hasNodeType = (type: string) => KNOWN_TYPES.has(type);

describe('getWorkflowStaging', () => {
	it('is undefined before the workflow builder skill loads', () => {
		expect(getWorkflowStaging(tree([call('search_nodes')]), { hasNodeType })).toBeUndefined();
	});

	it('starts when the workflow builder skill loads, by name or by id', () => {
		expect(getWorkflowStaging(tree([loadBuilder()]), { hasNodeType })).toEqual({
			runId: 'run-1',
			nodes: [],
		});
		const byId = tree([call('load_skill', { skillId: 'workflow-builder' }, { isLoading: true })]);
		expect(getWorkflowStaging(byId, { hasNodeType })).toBeDefined();
	});

	it('adds each requested node type once, in the order the agent asked for it', () => {
		const staging = getWorkflowStaging(
			tree([
				loadBuilder(),
				call('get_node_types', {
					nodeTypes: [
						'n8n-nodes-base.slack',
						{
							nodeType: 'n8n-nodes-base.gmail',
							version: 2.1,
							resource: 'message',
							operation: 'send',
						},
					],
				}),
				call(
					'get_node_types',
					{ nodeTypes: ['n8n-nodes-base.slack', 'n8n-nodes-base.set'] },
					{ isLoading: true, result: undefined },
				),
			]),
			{ hasNodeType },
		);

		expect(staging?.nodes).toEqual([
			{ id: 'staging:n8n-nodes-base.slack', nodeType: 'n8n-nodes-base.slack' },
			{
				id: 'staging:n8n-nodes-base.gmail:message:send',
				nodeType: 'n8n-nodes-base.gmail',
				version: 2.1,
				resource: 'message',
				operation: 'send',
			},
			{ id: 'staging:n8n-nodes-base.set', nodeType: 'n8n-nodes-base.set' },
		]);
	});

	it('keeps nodes from a schema read that failed', () => {
		const staging = getWorkflowStaging(
			tree([
				loadBuilder(),
				call('get_node_types', { nodeTypes: ['n8n-nodes-base.slack'] }, { error: 'boom' }),
			]),
			{ hasNodeType },
		);

		expect(staging?.nodes.map((node) => node.nodeType)).toEqual(['n8n-nodes-base.slack']);
	});

	it('skips node types the editor does not know', () => {
		const staging = getWorkflowStaging(
			tree([loadBuilder(), call('get_node_types', { nodeTypes: ['acme.unknown', { bad: 1 }] })]),
			{ hasNodeType },
		);

		expect(staging?.nodes).toEqual([]);
	});

	it('includes the calls of sub-agents', () => {
		const child = tree([call('get_node_types', { nodeTypes: ['n8n-nodes-base.set'] })]);
		const staging = getWorkflowStaging(tree([loadBuilder()], [child]), { hasNodeType });

		expect(staging?.nodes.map((node) => node.nodeType)).toEqual(['n8n-nodes-base.set']);
	});

	it.each([
		['the agent reads a saved workflow', call('get_workflow', { workflowId: 'wf-1' })],
		[
			'the agent reads a saved workflow as code',
			call('get_workflow_as_code', { workflowId: 'wf-1' }),
		],
		[
			'a build names a saved workflow',
			call('workflow_builder_build_workflow', { filePath: 'a.ts', workflowId: 'wf-1' }),
		],
	])('is undefined when %s', (_, editCall) => {
		expect(getWorkflowStaging(tree([loadBuilder(), editCall]), { hasNodeType })).toBeUndefined();
	});

	it('stays ended after a build of the run saved the workflow', () => {
		const saved = call(
			'workflow_builder_build_workflow',
			{ filePath: 'a.ts' },
			{ result: { success: true, filePath: 'a.ts', workflowId: 'wf-new' } },
		);
		const verify = call('workflow_builder_verify_built_workflow', { workflowId: 'wf-new' });

		expect(
			getWorkflowStaging(tree([loadBuilder(), saved, verify]), { hasNodeType }),
		).toBeUndefined();
	});

	it('keeps staging while a build runs or after a build that did not save', () => {
		const running = call(
			'workflow_builder_build_workflow',
			{ filePath: 'a.ts' },
			{ isLoading: true, result: undefined },
		);
		const blocked = call(
			'workflow_builder_build_workflow',
			{ filePath: 'a.ts' },
			{ result: { success: false, filePath: 'a.ts' } },
		);

		expect(getWorkflowStaging(tree([loadBuilder(), running]), { hasNodeType })).toBeDefined();
		expect(getWorkflowStaging(tree([loadBuilder(), blocked]), { hasNodeType })).toBeDefined();
	});
});

describe('toStagingWorkflowNodes', () => {
	const describeType = (type: string) =>
		({
			'n8n-nodes-base.slack': { displayName: 'Slack', defaultVersion: 2.3 },
			'n8n-nodes-base.set': { displayName: 'Edit Fields', defaultVersion: 3.4 },
			'n8n-nodes-base.scheduleTrigger': {
				displayName: 'Schedule Trigger',
				defaultVersion: 1.2,
				isTrigger: true,
			},
		})[type];

	function staging(nodes: WorkflowStaging['nodes']): WorkflowStaging {
		return { runId: 'run-1', nodes };
	}

	it('lays the nodes out in a grid of 4 columns', () => {
		const nodes = toStagingWorkflowNodes(
			staging(
				Array.from({ length: 5 }, (_, i) => ({
					id: `staging:n8n-nodes-base.set:${i}`,
					nodeType: 'n8n-nodes-base.set',
				})),
			),
			describeType,
		);

		// Wide enough for a configurable node and a two-line subtitle.
		expect(nodes.map((node) => node.position)).toEqual([
			[0, 0],
			[320, 0],
			[640, 0],
			[960, 0],
			[0, 224],
		]);
	});

	it('puts the triggers first, at the top left', () => {
		const nodes = toStagingWorkflowNodes(
			staging([
				{ id: 'staging:a', nodeType: 'n8n-nodes-base.slack' },
				{ id: 'staging:b', nodeType: 'n8n-nodes-base.set' },
				{ id: 'staging:c', nodeType: 'n8n-nodes-base.scheduleTrigger' },
			]),
			describeType,
		);

		expect(nodes.map((node) => [node.name, node.position])).toEqual([
			['Schedule Trigger', [0, 0]],
			['Slack', [320, 0]],
			['Edit Fields', [640, 0]],
		]);
	});

	it('names the nodes after their type and numbers repeated names', () => {
		const nodes = toStagingWorkflowNodes(
			staging([
				{ id: 'staging:a', nodeType: 'n8n-nodes-base.slack' },
				{ id: 'staging:b', nodeType: 'n8n-nodes-base.slack', operation: 'send' },
				{ id: 'staging:c', nodeType: 'n8n-nodes-base.set' },
			]),
			describeType,
		);

		expect(nodes.map((node) => node.name)).toEqual(['Slack', 'Slack 2', 'Edit Fields']);
	});

	it('uses the requested version, else the default version of the type', () => {
		const nodes = toStagingWorkflowNodes(
			staging([
				{ id: 'staging:a', nodeType: 'n8n-nodes-base.slack', version: 2.1 },
				{ id: 'staging:b', nodeType: 'n8n-nodes-base.set' },
			]),
			describeType,
		);

		expect(nodes.map((node) => node.typeVersion)).toEqual([2.1, 3.4]);
	});

	it('keeps the requested discriminators as parameters and the staging id', () => {
		const [node] = toStagingWorkflowNodes(
			staging([
				{
					id: 'staging:a',
					nodeType: 'n8n-nodes-base.slack',
					resource: 'message',
					operation: 'post',
				},
			]),
			describeType,
		);

		expect(node).toMatchObject({
			id: 'staging:a',
			type: 'n8n-nodes-base.slack',
			parameters: { resource: 'message', operation: 'post' },
		});
	});
});

describe('toStagingNodeTypeInfo', () => {
	it('uses the default version of the type', () => {
		expect(
			toStagingNodeTypeInfo({
				displayName: 'Slack',
				version: [1, 2, 2.3],
				defaultVersion: 2.2,
				group: ['output'],
			}),
		).toEqual({ displayName: 'Slack', defaultVersion: 2.2, isTrigger: false });
	});

	it('uses the newest version when the type has no default', () => {
		expect(
			toStagingNodeTypeInfo({ displayName: 'Slack', version: [1, 2.3, 2], group: ['output'] }),
		).toEqual({ displayName: 'Slack', defaultVersion: 2.3, isTrigger: false });
		expect(toStagingNodeTypeInfo({ displayName: 'Set', version: 3, group: ['input'] })).toEqual({
			displayName: 'Set',
			defaultVersion: 3,
			isTrigger: false,
		});
	});

	it('marks a trigger type', () => {
		expect(
			toStagingNodeTypeInfo({ displayName: 'Schedule Trigger', version: 1, group: ['trigger'] }),
		).toMatchObject({ isTrigger: true });
	});

	it('is undefined for an unknown type', () => {
		expect(toStagingNodeTypeInfo(null)).toBeUndefined();
	});
});

describe('isStagingDraft', () => {
	it('tells the staging canvas from a draft of a source file', () => {
		const workflow = { name: '', nodes: [], connections: {} };

		expect(isStagingDraft({ filePath: 'staging:run-1', revision: 0, workflow })).toBe(true);
		expect(isStagingDraft({ filePath: 'src/workflows/a.workflow.ts', revision: 1, workflow })).toBe(
			false,
		);
	});
});
