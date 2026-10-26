import { WORKFLOW_BUILDER_TOOL_NAMES } from '@n8n/api-types';
import { readonly } from 'vue';

import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';

import {
	findLatestAssistantTasks,
	toAssistantArtifactMessages,
	toAssistantToolCall,
} from '../assistantArtifactMessages';

// The chat panel exposes its messages read-only, so the inputs are read-only here too.
const mapToolCall = (call: ToolCall) => toAssistantToolCall(readonly(call));
const mapMessages = (messages: ChatMessage[], isStreaming: boolean) =>
	toAssistantArtifactMessages(readonly(messages), isStreaming);
const latestTasks = (messages: ChatMessage[]) => findLatestAssistantTasks(readonly(messages));

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

describe('toAssistantToolCall', () => {
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
});

describe('toAssistantArtifactMessages', () => {
	const messages: ChatMessage[] = [
		{ id: 'u1', role: 'user', content: 'Build a digest', createdAt: 1_000 },
		{ id: 'a1', role: 'assistant', content: 'Done', toolCalls: [toolCall()], status: 'success' },
		{ id: 'u2', role: 'user', content: 'Change it' },
		{ id: 'a2', role: 'assistant', content: '', toolCalls: [toolCall({ toolCallId: 'tc-2' })] },
	];

	it('gives each assistant message one orchestrator node with its tool calls', () => {
		const [user, assistant] = mapMessages(messages, false);

		expect(user).toMatchObject({
			id: 'u1',
			role: 'user',
			content: 'Build a digest',
			createdAt: new Date(1_000).toISOString(),
		});
		expect(user.agentTree).toBeUndefined();
		expect(assistant.agentTree).toMatchObject({
			role: 'orchestrator',
			status: 'completed',
			toolCalls: [expect.objectContaining({ toolCallId: 'tc-1' })],
			children: [],
		});
	});

	it('marks only the latest assistant message as live while the chat streams', () => {
		const mapped = mapMessages(messages, true);

		expect(mapped[1].isStreaming).toBe(false);
		expect(mapped[1].agentTree?.status).toBe('completed');
		expect(mapped[3].isStreaming).toBe(true);
		expect(mapped[3].agentTree?.status).toBe('active');
	});

	it('marks a failed assistant message as an error', () => {
		const [, assistant] = mapMessages([messages[0], { ...messages[1], status: 'error' }], false);

		expect(assistant.agentTree?.status).toBe('error');
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
