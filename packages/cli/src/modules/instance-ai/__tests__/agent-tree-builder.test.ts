import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';

const { buildAgentTreeFromEvents, findAgentNodeInTree } =
	require('../../../../../@n8n/instance-ai/src/utils/agent-tree') as {
		buildAgentTreeFromEvents: (events: InstanceAiEvent[]) => InstanceAiAgentNode;
		findAgentNodeInTree: (
			tree: InstanceAiAgentNode,
			agentId: string,
		) => InstanceAiAgentNode | undefined;
	};

describe('buildAgentTreeFromEvents', () => {
	it('should build a tree from run-start + text-delta + run-finish', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { text: 'Hello ' },
			},
			{
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { text: 'world' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'completed' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.agentId).toBe('agent-001');
		expect(tree.role).toBe('orchestrator');
		expect(tree.status).toBe('completed');
		expect(tree.textContent).toBe('Hello world');
		expect(tree.timeline).toEqual([{ type: 'text', content: 'Hello world' }]);
	});

	it('should build a tree with tool calls and results', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: {
					toolCallId: 'tc-1',
					toolName: 'list-workflows',
					args: { limit: 10 },
				},
			},
			{
				type: 'tool-result',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: {
					toolCallId: 'tc-1',
					result: { workflows: ['wf1'] },
				},
			},
			{
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { text: 'Found your workflows' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'completed' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.toolCalls).toHaveLength(1);
		expect(tree.toolCalls[0]).toMatchObject({
			toolCallId: 'tc-1',
			toolName: 'list-workflows',
			args: { limit: 10 },
			result: { workflows: ['wf1'] },
			isLoading: false,
			renderHint: 'default',
		});
		expect(tree.timeline).toEqual([
			{ type: 'tool-call', toolCallId: 'tc-1' },
			{ type: 'text', content: 'Found your workflows' },
		]);
	});

	it('should handle tool errors', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-1', toolName: 'task-control', args: {} },
			},
			{
				type: 'tool-error',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-1', error: 'Something went wrong' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'completed' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.toolCalls[0].error).toBe('Something went wrong');
		expect(tree.toolCalls[0].isLoading).toBe(false);
		expect(tree.toolCalls[0].renderHint).toBe('tasks');
	});

	it('should build a tree with sub-agents', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-d', toolName: 'delegate', args: { task: 'build' } },
			},
			{
				type: 'agent-spawned',
				runId: 'run-1',
				agentId: 'agent-002',
				payload: {
					parentId: 'agent-001',
					role: 'workflow-builder',
					tools: ['build-workflow'],
				},
			},
			{
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-002',
				payload: { text: 'Building workflow...' },
			},
			{
				type: 'agent-completed',
				runId: 'run-1',
				agentId: 'agent-002',
				payload: { role: 'workflow-builder', result: 'Done' },
			},
			{
				type: 'tool-result',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-d', result: 'Delegate completed' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'completed' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.children).toHaveLength(1);
		expect(tree.children[0]).toMatchObject({
			agentId: 'agent-002',
			role: 'workflow-builder',
			tools: ['build-workflow'],
			status: 'completed',
			textContent: 'Building workflow...',
			result: 'Done',
		});
		expect(tree.timeline).toEqual([
			{ type: 'tool-call', toolCallId: 'tc-d' },
			{ type: 'child', agentId: 'agent-002' },
		]);
	});

	it('should handle reasoning-delta events', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'reasoning-delta',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { text: 'Thinking...' },
			},
			{
				type: 'reasoning-delta',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { text: ' more thoughts' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'completed' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.reasoning).toBe('Thinking... more thoughts');
	});

	it('should return a default active tree for empty events list', () => {
		const tree = buildAgentTreeFromEvents([]);

		expect(tree.agentId).toBe('agent-001');
		expect(tree.status).toBe('active');
		expect(tree.textContent).toBe('');
		expect(tree.toolCalls).toEqual([]);
		expect(tree.children).toEqual([]);
	});

	it('should handle run-finish with error status', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'error', reason: 'API failure' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.status).toBe('error');
	});

	it('should handle run-finish with cancelled status', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'cancelled', reason: 'user_cancelled' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.status).toBe('cancelled');
	});

	it('should handle error events', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'error',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { content: 'Something broke' },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'error', reason: 'Something broke' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.textContent).toContain('Something broke');
		expect(tree.status).toBe('error');
	});

	it('should apply correct renderHint for delegate tool', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-1', toolName: 'delegate', args: {} },
			},
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-2', toolName: 'build-workflow-with-agent', args: {} },
			},
			{
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { status: 'completed' },
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.toolCalls[0].renderHint).toBe('delegate');
		expect(tree.toolCalls[1].renderHint).toBe('builder');
	});

	it('should handle confirmation-request events', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { messageId: 'msg-1' },
			},
			{
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: { toolCallId: 'tc-1', toolName: 'delete-workflow', args: { id: 'wf-1' } },
			},
			{
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'agent-001',
				payload: {
					requestId: 'cr-1',
					toolCallId: 'tc-1',
					toolName: 'delete-workflow',
					args: { id: 'wf-1' },
					severity: 'destructive',
					message: 'Delete workflow?',
				},
			},
		];

		const tree = buildAgentTreeFromEvents(events);

		expect(tree.toolCalls).toHaveLength(1);
		expect(tree.toolCalls[0].confirmation).toMatchObject({
			requestId: 'cr-1',
			severity: 'destructive',
			message: 'Delete workflow?',
		});
		expect(tree.toolCalls[0].isLoading).toBe(true);
	});
});

describe('findAgentNodeInTree', () => {
	it('should find root node by agentId', () => {
		const tree = buildAgentTreeFromEvents([
			{
				type: 'run-start',
				runId: 'r',
				agentId: 'agent-001',
				payload: { messageId: 'm' },
			},
		]);

		expect(findAgentNodeInTree(tree, 'agent-001')).toBe(tree);
	});

	it('should find child node by agentId', () => {
		const events: InstanceAiEvent[] = [
			{
				type: 'run-start',
				runId: 'r',
				agentId: 'agent-001',
				payload: { messageId: 'm' },
			},
			{
				type: 'agent-spawned',
				runId: 'r',
				agentId: 'agent-002',
				payload: { parentId: 'agent-001', role: 'builder', tools: [] },
			},
		];

		const tree = buildAgentTreeFromEvents(events);
		const child = findAgentNodeInTree(tree, 'agent-002');

		expect(child).toBeDefined();
		expect(child?.agentId).toBe('agent-002');
	});

	it('should return undefined for unknown agentId', () => {
		const tree = buildAgentTreeFromEvents([
			{
				type: 'run-start',
				runId: 'r',
				agentId: 'agent-001',
				payload: { messageId: 'm' },
			},
		]);

		expect(findAgentNodeInTree(tree, 'agent-999')).toBeUndefined();
	});
});
