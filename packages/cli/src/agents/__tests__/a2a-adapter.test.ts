import { fromA2ARequest, toA2AResponse, internalStepToA2AStream } from '../a2a-adapter';
import type { A2ASendMessageRequest } from '../a2a-adapter';
import type { AgentTaskResult } from '@/services/agents/agents.types';

describe('fromA2ARequest', () => {
	it('should concatenate text parts into prompt', () => {
		const req: A2ASendMessageRequest = {
			message: {
				message_id: 'msg-1',
				role: 'user',
				parts: [{ text: 'Hello' }, { text: 'World' }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.prompt).toBe('Hello\nWorld');
	});

	it('should use task_id and context_id from message when provided', () => {
		const req: A2ASendMessageRequest = {
			message: {
				message_id: 'msg-1',
				role: 'user',
				parts: [{ text: 'Test' }],
				task_id: 'task-abc',
				context_id: 'ctx-xyz',
			},
		};

		const result = fromA2ARequest(req);
		expect(result.taskId).toBe('task-abc');
		expect(result.contextId).toBe('ctx-xyz');
	});

	it('should generate UUIDs when task_id and context_id are missing', () => {
		const req: A2ASendMessageRequest = {
			message: {
				message_id: 'msg-1',
				role: 'user',
				parts: [{ text: 'Test' }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.taskId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		expect(result.contextId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it('should return empty prompt when no text parts', () => {
		const req: A2ASendMessageRequest = {
			message: {
				message_id: 'msg-1',
				role: 'user',
				parts: [{ data: { key: 'value' } }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.prompt).toBe('');
	});

	it('should skip non-text parts', () => {
		const req: A2ASendMessageRequest = {
			message: {
				message_id: 'msg-1',
				role: 'user',
				parts: [{ text: 'Start' }, { data: { some: 'data' } }, { text: 'End' }],
			},
		};

		const result = fromA2ARequest(req);
		expect(result.prompt).toBe('Start\nEnd');
	});
});

describe('toA2AResponse', () => {
	it('should map completed result to A2A task with completed state', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			summary: 'All done',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.id).toBe('task-1');
		expect(response.task.context_id).toBe('ctx-1');
		expect(response.task.status.state).toBe('completed');
	});

	it('should map error result to failed state', () => {
		const result: AgentTaskResult = {
			status: 'error',
			message: 'Something broke',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.status.state).toBe('failed');
		expect(response.task.status.message?.parts[0].text).toBe('Something broke');
	});

	it('should include summary as result artifact', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			summary: 'Deployed to prod',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.artifacts).toHaveLength(1);
		expect(response.task.artifacts![0].name).toBe('result');
		expect(response.task.artifacts![0].parts[0].text).toBe('Deployed to prod');
	});

	it('should include execution log artifact when steps exist', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			summary: 'Done',
			steps: [{ action: 'execute_workflow', workflowName: 'Test', result: 'success' }],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');

		expect(response.task.artifacts).toHaveLength(2);
		expect(response.task.artifacts![1].name).toBe('execution-log');
		expect(response.task.artifacts![1].parts[0].data).toEqual(result.steps);
	});

	it('should omit artifacts when no summary and no steps', () => {
		const result: AgentTaskResult = {
			status: 'completed',
			steps: [],
		};

		const response = toA2AResponse(result, 'task-1', 'ctx-1');
		expect(response.task.artifacts).toBeUndefined();
	});
});

describe('internalStepToA2AStream', () => {
	it('should map step event to status_update with working state', () => {
		const event = {
			type: 'step',
			action: 'execute_workflow',
			workflowName: 'Deploy',
			reasoning: 'Need to deploy',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		expect('status_update' in result).toBe(true);
		const update = (result as { status_update: { status: { state: string } } }).status_update;
		expect(update.status.state).toBe('working');
	});

	it('should map send_message step to delegation description', () => {
		const event = {
			type: 'step',
			action: 'send_message',
			toAgent: 'CommsBot',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		const update = (
			result as { status_update: { status: { message: { parts: Array<{ text: string }> } } } }
		).status_update;
		expect(update.status.message.parts[0].text).toContain('CommsBot');
	});

	it('should map observation to artifact_update', () => {
		const event = {
			type: 'observation',
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		expect('artifact_update' in result).toBe(true);
		const update = (
			result as {
				artifact_update: {
					artifact: { name: string; parts: Array<{ data: Record<string, unknown> }> };
				};
			}
		).artifact_update;
		expect(update.artifact.name).toBe('observation-execute_workflow');
		expect(update.artifact.parts[0].data).toMatchObject({
			action: 'execute_workflow',
			result: 'success',
			workflowName: 'Test Suite',
		});
	});

	it('should map done event to final task object', () => {
		const event = {
			type: 'done',
			status: 'completed',
			summary: 'All tasks finished',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');

		expect('task' in result).toBe(true);
		const task = (
			result as { task: { status: { state: string; message: { parts: Array<{ text: string }> } } } }
		).task;
		expect(task.status.state).toBe('completed');
		expect(task.status.message.parts[0].text).toBe('All tasks finished');
	});

	it('should map failed done event to failed state', () => {
		const event = {
			type: 'done',
			status: 'error',
			summary: 'Something broke',
		};

		const result = internalStepToA2AStream(event, 'task-1', 'ctx-1');
		const task = (result as { task: { status: { state: string } } }).task;
		expect(task.status.state).toBe('failed');
	});

	it('should preserve task and context IDs across all event types', () => {
		const events = [
			{ type: 'step', action: 'execute_workflow', workflowName: 'Test' },
			{ type: 'observation', action: 'execute_workflow', result: 'success' },
			{ type: 'done', status: 'completed', summary: 'Done' },
		];

		for (const event of events) {
			const result = internalStepToA2AStream(event, 'task-42', 'ctx-99');
			const json = JSON.stringify(result);
			expect(json).toContain('task-42');
			expect(json).toContain('ctx-99');
		}
	});
});
