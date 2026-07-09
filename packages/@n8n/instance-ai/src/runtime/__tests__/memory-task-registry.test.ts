import type { ScopedMemoryTaskEvent } from '@n8n/agents';

import { MemoryTaskRegistry } from '../memory-task-registry';

function taskInfo(
	id: string,
	taskKind: 'observer' | 'reflector',
	overrides: Partial<{ status: 'queued' | 'running'; startedAt: Date }> = {},
) {
	return {
		id,
		taskKind,
		observationScopeId: 'thread-1',
		status: overrides.status ?? 'queued',
		queuedAt: new Date(),
		...(overrides.startedAt ? { startedAt: overrides.startedAt } : {}),
	} as ScopedMemoryTaskEvent['task'];
}

describe('MemoryTaskRegistry', () => {
	it('tracks queued → running → completed lifecycle', () => {
		const registry = new MemoryTaskRegistry();
		const threadId = 'thread-1';

		registry.handleEvent(threadId, {
			type: 'queued',
			task: taskInfo('task-1', 'observer'),
		});
		expect(registry.getTasks(threadId)).toMatchObject([
			{ taskId: 'task-1', taskKind: 'observer', status: 'queued' },
		]);

		const startedAt = new Date('2026-01-01T00:00:00Z');
		registry.handleEvent(threadId, {
			type: 'started',
			task: taskInfo('task-1', 'observer', { status: 'running', startedAt }),
		});
		expect(registry.getTasks(threadId)).toMatchObject([
			{
				taskId: 'task-1',
				taskKind: 'observer',
				status: 'running',
				startedAt: startedAt.getTime(),
			},
		]);

		registry.handleEvent(threadId, {
			type: 'completed',
			task: taskInfo('task-1', 'observer', { status: 'running' }),
			value: { status: 'skipped' },
		});
		expect(registry.getTasks(threadId)).toEqual([]);
	});

	it('removes tasks on skipped and failed outcomes', () => {
		const registry = new MemoryTaskRegistry();
		const threadId = 'thread-1';

		registry.handleEvent(threadId, {
			type: 'queued',
			task: taskInfo('task-1', 'reflector'),
		});
		registry.handleEvent(threadId, {
			type: 'skipped',
			task: taskInfo('task-1', 'reflector'),
			reason: 'lock-held',
		});
		expect(registry.getTasks(threadId)).toEqual([]);

		registry.handleEvent(threadId, {
			type: 'queued',
			task: taskInfo('task-2', 'observer'),
		});
		registry.handleEvent(threadId, {
			type: 'failed',
			task: taskInfo('task-2', 'observer', { status: 'running' }),
			error: new Error('boom'),
		});
		expect(registry.getTasks(threadId)).toEqual([]);
	});

	it('clearThread drops all tracked tasks for a thread', () => {
		const registry = new MemoryTaskRegistry();
		registry.handleEvent('thread-1', {
			type: 'queued',
			task: taskInfo('task-1', 'observer'),
		});
		registry.handleEvent('thread-2', {
			type: 'queued',
			task: { ...taskInfo('task-2', 'observer'), observationScopeId: 'thread-2' },
		});

		registry.clearThread('thread-1');
		expect(registry.getTasks('thread-1')).toEqual([]);
		expect(registry.getTasks('thread-2')).toHaveLength(1);
	});
});
