import {
	AGENT_BUILDER_TOOL_NAMES,
	TOOL_CATALOG_CALL_TOOL_NAME,
	WORKFLOW_BUILDER_TOOL_NAMES,
} from '@n8n/api-types';
import { readonly } from 'vue';

import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import { isAgentEditingAgent, isAgentEditingWorkflow } from '../../canvasPreview.utils';
import { useResourceRegistry } from '../../useResourceRegistry';
import {
	findArchivedAssistantWorkflowIds,
	findLatestAssistantTasks,
	toArtifactToolCall,
	toAssistantArtifactTurns,
} from '../assistantArtifactTurns';

// The chat panel exposes its messages read-only, so the inputs are read-only here too.
const mapToolCall = (call: ToolCall) => toArtifactToolCall(readonly(call));
const mapMessages = (messages: ChatMessage[], isStreaming: boolean) =>
	toAssistantArtifactTurns(readonly(messages), isStreaming);
const latestTasks = (messages: ChatMessage[]) => findLatestAssistantTasks(readonly(messages));
const archivedIds = (messages: ChatMessage[]) =>
	findArchivedAssistantWorkflowIds(readonly(messages));

function toolCall(overrides: Partial<ToolCall> = {}): ToolCall {
	return {
		tool: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
		toolCallId: 'tc-1',
		input: { code: 'workflow' },
		output: { success: true, workflowId: 'wf-1' },
		state: 'done',
		...overrides,
	};
}

function tasksEvent(id: string, description: string): NonNullable<ChatMessage['hostEvents']>[0] {
	return {
		id,
		name: 'tasks-update',
		key: 'tasks',
		payload: { tasks: { tasks: [{ id, description, status: 'todo' }] } },
	};
}

describe('toArtifactToolCall', () => {
	it('keeps the tool name, input and output', () => {
		expect(mapToolCall(toolCall())).toEqual({
			toolCallId: 'tc-1',
			toolName: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
			args: { code: 'workflow' },
			result: { success: true, workflowId: 'wf-1' },
			isLoading: false,
		});
	});

	it.each(['pending', 'running', 'suspended'] as const)('marks a %s call as loading', (state) => {
		expect(mapToolCall(toolCall({ state })).isLoading).toBe(true);
	});

	it('gives a failed call an error and no result', () => {
		const mapped = mapToolCall(toolCall({ state: 'error', output: { error: 'Invalid workflow' } }));

		expect(mapped.error).toBe('Invalid workflow');
		expect(mapped).not.toHaveProperty('result');
	});

	it('gives an input that is not an object as empty arguments', () => {
		expect(mapToolCall(toolCall({ input: 'text' })).args).toEqual({});
	});

	it('reads a tool catalog call as the tool that it runs', () => {
		const mapped = mapToolCall(
			toolCall({
				tool: TOOL_CATALOG_CALL_TOOL_NAME,
				input: {
					tool: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
					arguments: { filePath: 'src/workflows/main.workflow.ts', name: 'Digest' },
				},
			}),
		);

		expect(mapped.toolName).toBe(WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW);
		expect(mapped.args).toEqual({ filePath: 'src/workflows/main.workflow.ts', name: 'Digest' });
		expect(mapped.result).toEqual({ success: true, workflowId: 'wf-1' });
	});

	it('keeps a tool catalog call that names no tool', () => {
		const mapped = mapToolCall(
			toolCall({ tool: TOOL_CATALOG_CALL_TOOL_NAME, input: { arguments: {} } }),
		);

		expect(mapped.toolName).toBe(TOOL_CATALOG_CALL_TOOL_NAME);
		expect(mapped.args).toEqual({ arguments: {} });
	});

	it('registers the workflow that a tool catalog call builds', () => {
		const messages: ChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'Build a workflow' },
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				toolCalls: [
					toolCall({
						tool: TOOL_CATALOG_CALL_TOOL_NAME,
						input: {
							tool: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
							arguments: { name: 'Digest' },
						},
						output: { success: true, workflowId: 'wf-1', workflowName: 'Digest' },
					}),
				],
			},
		];

		const { producedArtifacts } = useResourceRegistry(() => mapMessages(messages, false));

		expect(producedArtifacts.get('wf-1')).toMatchObject({
			type: 'workflow',
			id: 'wf-1',
			name: 'Digest',
		});
	});
});

describe('toAssistantArtifactTurns', () => {
	const messages: ChatMessage[] = [
		{ id: 'u1', role: 'user', content: 'Build a digest', createdAt: 1_000 },
		{ id: 'a1', role: 'assistant', content: 'Done', toolCalls: [toolCall()], status: 'success' },
		{ id: 'u2', role: 'user', content: 'Change it' },
		{ id: 'a2', role: 'assistant', content: '', toolCalls: [toolCall({ toolCallId: 'tc-2' })] },
	];

	it('gives each message one turn with its tool calls', () => {
		const [user, assistant] = mapMessages(messages, false);

		expect(user).toEqual({ id: 'u1', role: 'user', isLive: false, toolCalls: [] });
		expect(assistant).toEqual({
			id: 'a1',
			role: 'assistant',
			isLive: false,
			toolCalls: [expect.objectContaining({ toolCallId: 'tc-1' })],
		});
	});

	it('marks only the latest assistant message as live while the chat streams', () => {
		const mapped = mapMessages(messages, true);

		expect(mapped.map((turn) => turn.isLive)).toEqual([false, false, false, true]);
	});

	describe('the steps of one run', () => {
		const selectAgent = toolCall({
			tool: AGENT_BUILDER_TOOL_NAMES.SELECT_AGENT,
			toolCallId: 'tc-select',
			input: {},
			output: { ok: true, agentId: 'agent-1' },
		});
		// The chat adds a message for each model step of the run.
		const steps: ChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'Rename it' },
			{ id: 's1', role: 'assistant', content: '', toolCalls: [selectAgent] },
			{ id: 's2', role: 'assistant', content: 'Thinking it over' },
		];

		it('makes one turn with the tool calls of every step', () => {
			const turns = mapMessages(steps, true);

			expect(turns).toEqual([
				{ id: 'u1', role: 'user', isLive: false, toolCalls: [] },
				{
					id: 's1',
					role: 'assistant',
					isLive: true,
					toolCalls: [expect.objectContaining({ toolCallId: 'tc-select' })],
				},
			]);
		});

		it('keeps the agent that an earlier step selected locked until the run ends', () => {
			expect(isAgentEditingAgent(mapMessages(steps, true), 'agent-1')).toBe(true);
			expect(isAgentEditingAgent(mapMessages(steps, false), 'agent-1')).toBe(false);
		});

		it('takes the setup announcement of the latest step', () => {
			const [, turn] = mapMessages(
				[
					...steps,
					{
						id: 's3',
						role: 'assistant',
						content: '',
						hostEvents: [
							{ id: 'e1', name: 'setup-items', payload: { workflowId: 'wf-3', items: [] } },
						],
					},
				],
				false,
			);

			expect(turn.announcedWorkflowId).toBe('wf-3');
		});
	});

	it('takes the setup announcement from the latest setup-items host event', () => {
		const [turn] = mapMessages(
			[
				{
					id: 'a1',
					role: 'assistant',
					content: '',
					hostEvents: [
						{ id: 'e1', name: 'setup-items', payload: { workflowId: 'wf-1', items: [] } },
						{ id: 'e2', name: 'setup-items', payload: { workflowId: 'wf-2', items: [] } },
						{ id: 'e3', name: 'setup-items', payload: { items: [] } },
					],
				},
			],
			false,
		);

		expect(turn.announcedWorkflowId).toBe('wf-2');
	});

	it('locks a workflow that the setup flow announced for a build in flight', () => {
		const turns = mapMessages(
			[
				{
					id: 'a1',
					role: 'assistant',
					content: '',
					toolCalls: [
						toolCall({ input: { code: 'workflow' }, output: undefined, state: 'running' }),
					],
					hostEvents: [
						{ id: 'e1', name: 'setup-items', payload: { workflowId: 'wf-1', items: [] } },
					],
				},
			],
			true,
		);

		expect(isAgentEditingWorkflow(turns, 'wf-1')).toBe(true);
		expect(isAgentEditingWorkflow(turns, 'wf-2')).toBe(false);
	});

	it('keeps the resolved copy of a call that the history stores open and then resolved', () => {
		const setupCall = (overrides: Partial<ToolCall>) =>
			toolCall({ tool: 'setup_workflow', toolCallId: 'tc-setup', ...overrides });
		const turns = mapMessages(
			[
				{ id: 'u1', role: 'user', content: 'Set it up' },
				{
					id: 'a1',
					role: 'assistant',
					content: '',
					toolCalls: [
						setupCall({ input: { workflowId: 'wf-1' }, output: undefined, state: 'suspended' }),
					],
				},
				{
					id: 'a2',
					role: 'assistant',
					content: 'Done',
					toolCalls: [setupCall({ input: undefined, output: { success: true }, state: 'done' })],
				},
			],
			false,
		);

		expect(turns[1].toolCalls).toEqual([
			{
				toolCallId: 'tc-setup',
				toolName: 'setup_workflow',
				args: { workflowId: 'wf-1' },
				result: { success: true },
				isLoading: false,
			},
		]);
		expect(isAgentEditingWorkflow(turns, 'wf-1')).toBe(false);
	});

	it('keeps the tool that a tool catalog call runs when the resolved copy has no input', () => {
		const catalogCall = (overrides: Partial<ToolCall>) =>
			toolCall({ tool: TOOL_CATALOG_CALL_TOOL_NAME, toolCallId: 'tc-build', ...overrides });
		const messages: ChatMessage[] = [
			{ id: 'u1', role: 'user', content: 'Build a workflow' },
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				toolCalls: [
					catalogCall({
						input: {
							tool: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
							arguments: { name: 'Digest' },
						},
						output: undefined,
						state: 'suspended',
					}),
				],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: 'Done',
				toolCalls: [
					catalogCall({
						input: undefined,
						output: { success: true, workflowId: 'wf-1', workflowName: 'Digest' },
						state: 'done',
					}),
				],
			},
		];

		const turns = mapMessages(messages, false);

		expect(turns[1].toolCalls).toEqual([
			{
				toolCallId: 'tc-build',
				toolName: WORKFLOW_BUILDER_TOOL_NAMES.BUILD_WORKFLOW,
				args: { name: 'Digest' },
				result: { success: true, workflowId: 'wf-1', workflowName: 'Digest' },
				isLoading: false,
			},
		]);
		const { producedArtifacts } = useResourceRegistry(() => mapMessages(messages, false));
		expect(producedArtifacts.get('wf-1')).toMatchObject({ type: 'workflow', id: 'wf-1' });
	});
});

describe('findLatestAssistantTasks', () => {
	it('reads the latest task list from the host events', () => {
		const tasks = latestTasks([
			{ id: 'a1', role: 'assistant', content: '', hostEvents: [tasksEvent('t1', 'First')] },
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				hostEvents: [tasksEvent('t2', 'Second'), { id: 'e', name: 'status', payload: {} }],
			},
		]);

		expect(tasks?.tasks).toEqual([{ id: 't2', description: 'Second', status: 'todo' }]);
	});

	it('skips a task list that does not match the schema', () => {
		const tasks = latestTasks([
			{ id: 'a1', role: 'assistant', content: '', hostEvents: [tasksEvent('t1', 'First')] },
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				hostEvents: [{ id: 'e', name: 'tasks-update', payload: { tasks: 'bad' } }],
			},
		]);

		expect(tasks?.tasks).toEqual([{ id: 't1', description: 'First', status: 'todo' }]);
	});

	it('gives null when the thread has no task list', () => {
		expect(latestTasks([{ id: 'u1', role: 'user', content: 'Hi' }])).toBeNull();
	});
});

describe('findArchivedAssistantWorkflowIds', () => {
	it('collects the archived workflows of every turn', () => {
		const ids = archivedIds([
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				hostEvents: [{ id: 'e1', name: 'workflows-archived', payload: { workflowIds: ['wf-1'] } }],
			},
			{
				id: 'a2',
				role: 'assistant',
				content: '',
				hostEvents: [
					tasksEvent('t1', 'First'),
					{ id: 'e2', name: 'workflows-archived', payload: { workflowIds: ['wf-2', 'wf-3'] } },
				],
			},
		]);

		expect(ids).toEqual(new Set(['wf-1', 'wf-2', 'wf-3']));
	});

	it('skips an event that does not match the schema', () => {
		const ids = archivedIds([
			{
				id: 'a1',
				role: 'assistant',
				content: '',
				hostEvents: [{ id: 'e1', name: 'workflows-archived', payload: { workflowIds: 'wf-1' } }],
			},
		]);

		expect(ids.size).toBe(0);
	});
});
