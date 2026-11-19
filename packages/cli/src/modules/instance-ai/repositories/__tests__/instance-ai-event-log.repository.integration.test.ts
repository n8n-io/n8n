import type { InstanceAiRunFinishEvent } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { InstanceAiEventLogRepository } from '../instance-ai-event-log.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

describe('InstanceAiEventLogRepository.getRunFinish', () => {
	let repository: InstanceAiEventLogRepository;
	const threadId = randomUUID();
	const otherThreadId = randomUUID();

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		repository = Container.get(InstanceAiEventLogRepository);
		const project = await createTeamProject();
		await Container.get(InstanceAiThreadRepository).insert(
			[threadId, otherThreadId].map((id) => ({
				id,
				resourceId: 'test-user',
				projectId: project.id,
				title: '',
			})),
		);
	});

	afterEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function finish(
		runId: string,
		payload: InstanceAiRunFinishEvent['payload'],
	): InstanceAiRunFinishEvent {
		return { type: 'run-finish', runId, agentId: 'agent-1', payload };
	}

	it('returns null when the run has no finish event', async () => {
		await expect(repository.getRunFinish(threadId, 'run-1')).resolves.toBeNull();
		await repository.appendBatch(threadId, 1, [
			{ type: 'run-start', runId: 'run-1', agentId: 'agent-1', payload: { messageId: 'm-1' } },
			finish('run-2', { status: 'completed' }),
		]);
		await repository.appendBatch(otherThreadId, 1, [finish('run-1', { status: 'completed' })]);

		await expect(repository.getRunFinish(threadId, 'run-1')).resolves.toBeNull();
	});

	it('returns the latest matching finish by sequence, excluding other threads, runs, and events', async () => {
		await repository.appendBatch(threadId, 2, [
			finish('run-1', { status: 'cancelled', reason: 'user_cancelled' }),
			finish('run-2', { status: 'completed' }),
			{ type: 'run-start', runId: 'run-1', agentId: 'agent-1', payload: { messageId: 'm-1' } },
		]);
		await repository.appendBatch(otherThreadId, 5, [finish('run-1', { status: 'completed' })]);
		await repository.appendBatch(threadId, 1, [
			finish('run-1', { status: 'interrupted', reason: 'crash_interrupted' }),
		]);

		await expect(repository.getRunFinish(threadId, 'run-1')).resolves.toEqual({
			status: 'cancelled',
			reason: 'user_cancelled',
		});
	});

	it('returns a finish without adding a missing reason', async () => {
		await repository.appendBatch(threadId, 1, [finish('run-1', { status: 'completed' })]);

		await expect(repository.getRunFinish(threadId, 'run-1')).resolves.toEqual({
			status: 'completed',
			reason: undefined,
		});
	});
});
