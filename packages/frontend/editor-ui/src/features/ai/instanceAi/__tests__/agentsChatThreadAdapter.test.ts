import { describe, expect, it } from 'vitest';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import {
	agentsChatToThreadMessages,
	deriveTasksFromAgentsChat,
	toInstanceAiToolCall,
} from '../agentsChatThreadAdapter';

function toolCall(overrides: Partial<ToolCall> & Pick<ToolCall, 'tool'>): ToolCall {
	return { toolCallId: `tc-${overrides.tool}`, state: 'done', ...overrides };
}

function assistant(id: string, toolCalls: ToolCall[], status?: ChatMessage['status']): ChatMessage {
	return { id, role: 'assistant', content: 'text', toolCalls, status };
}

const checklist = (status: 'todo' | 'done') => ({
	action: 'update-checklist',
	tasks: [{ id: 't1', description: 'Create table', status }],
});

describe('toInstanceAiToolCall', () => {
	it('maps a settled call to the legacy shape', () => {
		expect(
			toInstanceAiToolCall(
				toolCall({
					tool: 'workflows',
					input: { action: 'get', workflowId: 'wf-1' },
					output: { workflow: { id: 'wf-1', name: 'Orders' } },
					startTime: 0,
					endTime: 1000,
				}),
			),
		).toEqual({
			toolCallId: 'tc-workflows',
			toolName: 'workflows',
			args: { action: 'get', workflowId: 'wf-1' },
			result: { workflow: { id: 'wf-1', name: 'Orders' } },
			isLoading: false,
			startedAt: '1970-01-01T00:00:00.000Z',
			completedAt: '1970-01-01T00:00:01.000Z',
		});
	});

	it('marks running and suspended calls as loading', () => {
		expect(toInstanceAiToolCall(toolCall({ tool: 'x', state: 'running' })).isLoading).toBe(true);
		expect(toInstanceAiToolCall(toolCall({ tool: 'x', state: 'suspended' })).isLoading).toBe(true);
	});

	it('moves an error payload out of the result', () => {
		const mapped = toInstanceAiToolCall(
			toolCall({ tool: 'build-workflow', state: 'error', output: 'boom', input: 'not-a-record' }),
		);
		expect(mapped.result).toBeUndefined();
		expect(mapped.error).toBe('boom');
		expect(mapped.args).toEqual({});
	});
});

describe('deriveTasksFromAgentsChat', () => {
	it('uses the latest successful checklist write', () => {
		const tasks = deriveTasksFromAgentsChat([
			assistant('a-1', [toolCall({ tool: 'task-control', input: checklist('todo') })]),
			assistant('a-2', [
				toolCall({ tool: 'task-control', input: checklist('done'), toolCallId: 'tc-2' }),
				toolCall({
					tool: 'task-control',
					input: checklist('todo'),
					toolCallId: 'tc-3',
					state: 'error',
				}),
			]),
		]);
		expect(tasks?.tasks[0].status).toBe('done');
	});

	it('hides the list once a planned-task graph replaces it', () => {
		expect(
			deriveTasksFromAgentsChat([
				assistant('a-1', [
					toolCall({ tool: 'task-control', input: checklist('todo') }),
					toolCall({ tool: 'create-tasks', input: { tasks: [] } }),
				]),
			]),
		).toBeNull();
	});

	it('ignores malformed checklist input', () => {
		expect(
			deriveTasksFromAgentsChat([
				assistant('a-1', [
					toolCall({ tool: 'task-control', input: { action: 'update-checklist', tasks: 'x' } }),
				]),
			]),
		).toBeNull();
	});
});

describe('agentsChatToThreadMessages', () => {
	const messages: ChatMessage[] = [
		{ id: 'u-1', role: 'user', content: 'Build it', createdAt: 0 },
		assistant('a-1', [toolCall({ tool: 'task-control', input: checklist('todo') })], 'error'),
		{ id: 'u-2', role: 'user', content: 'Again' },
		assistant('a-2', [toolCall({ tool: 'build-workflow', state: 'running' })], 'streaming'),
	];

	it('keeps user text and wraps assistant tool calls in an orchestrator node', () => {
		const result = agentsChatToThreadMessages(messages, false);
		expect(result.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
		expect(result[0]).toMatchObject({ content: 'Build it', createdAt: '1970-01-01T00:00:00.000Z' });
		expect(result[1].agentTree).toMatchObject({ role: 'orchestrator', status: 'error' });
		expect(result[3].agentTree?.toolCalls[0]).toMatchObject({
			toolName: 'build-workflow',
			isLoading: true,
		});
	});

	it('marks only the latest assistant turn as live while streaming', () => {
		const result = agentsChatToThreadMessages(messages, true);
		expect(result[1].agentTree?.status).toBe('error');
		expect(result[3].agentTree?.status).toBe('active');
		expect(result[3].isStreaming).toBe(true);
		expect(agentsChatToThreadMessages(messages, false)[3].agentTree?.status).toBe('completed');
	});

	it('puts the derived checklist on the latest assistant turn only', () => {
		const result = agentsChatToThreadMessages(messages, false);
		expect(result[1].agentTree?.tasks).toBeUndefined();
		expect(result[3].agentTree?.tasks?.tasks).toHaveLength(1);
	});
});
