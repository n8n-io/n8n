import { randomUUID } from 'node:crypto';

import { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { TypeORMAgentMemory } from '../../storage/typeorm-agent-memory';
import { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';
import { InstanceAiObservationLockRepository } from '../instance-ai-observation-lock.repository';
import { InstanceAiObservationRepository } from '../instance-ai-observation.repository';
import { InstanceAiResourceRepository } from '../instance-ai-resource.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

describe('Instance AI thread history', () => {
	let repository: InstanceAiThreadRepository;
	let memory: TypeORMAgentMemory;
	let projectId: string;
	const ids = [1, 2, 3, 4].map((id) => '00000000-0000-4000-8000-' + String(id).padStart(12, '0'));
	const older = new Date('2026-01-01T00:00:00.000Z');
	const newer = new Date('2026-02-01T00:00:00.000Z');

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		repository = Container.get(InstanceAiThreadRepository);
		projectId = (await createTeamProject()).id;
		memory = new TypeORMAgentMemory(
			repository,
			Container.get(InstanceAiMessageRepository),
			Container.get(InstanceAiResourceRepository),
			Container.get(InstanceAiObservationRepository),
			Container.get(InstanceAiObservationCursorRepository),
			Container.get(InstanceAiObservationLockRepository),
			Container.get(Logger),
		);
	});

	beforeEach(async () => {
		await repository.delete({});
		await repository.insert(
			ids.map((id, index) => ({
				id,
				projectId,
				resourceId: 'user-1',
				title: index === 1 ? 'Invoice 100%_draft' : 'Invoice',
				createdAt: older,
				updatedAt: index === 0 ? older : newer,
			})),
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('uses timestamp and id cursors with a lookahead row and an empty final page', async () => {
		const first = await repository.listHistoryPage('user-1', 2);
		expect(first.map((thread) => thread.id)).toEqual([ids[3], ids[2], ids[1]]);
		const second = await repository.listHistoryPage('user-1', 2, undefined, first[1]);
		expect(second.map((thread) => thread.id)).toEqual([ids[1], ids[0]]);
		expect(await repository.listHistoryPage('user-1', 2, undefined, second[1])).toEqual([]);
	});

	it('filters case-insensitively, treats wildcard characters literally, and scopes to the user', async () => {
		await repository.insert({
			id: randomUUID(),
			projectId,
			resourceId: 'other-user',
			title: 'Invoice',
			createdAt: older,
			updatedAt: newer,
		});
		expect(await repository.listHistoryPage('user-1', 10, 'missing')).toEqual([]);
		expect(
			(await repository.listHistoryPage('user-1', 10, 'iNvOiCe')).map((row) => row.id),
		).toEqual([ids[3], ids[2], ids[1], ids[0]]);
		expect((await repository.listHistoryPage('user-1', 10, '%_')).map((row) => row.id)).toEqual([
			ids[1],
		]);
		const first = await repository.listHistoryPage('user-1', 2, 'invoice');
		expect(
			(await repository.listHistoryPage('user-1', 2, 'invoice', first[1])).map((row) => row.id),
		).toEqual([ids[1], ids[0]]);
	});

	it('advances activity after saving messages without shifting the remaining cursor page', async () => {
		const first = await repository.listHistoryPage('user-1', 2);
		await memory.saveMessages({
			threadId: ids[3],
			resourceId: 'user-1',
			messages: [
				{
					id: randomUUID(),
					role: 'user',
					content: [{ type: 'text', text: 'Hello' }],
					createdAt: older,
				},
			],
		});
		const updated = await repository.findOneByOrFail({ id: ids[3] });
		expect(updated.updatedAt.getTime()).toBeGreaterThan(newer.getTime());
		expect((await repository.findOneByOrFail({ id: ids[2] })).updatedAt).toEqual(newer);
		expect(
			(await repository.listHistoryPage('user-1', 2, undefined, first[1])).map((row) => row.id),
		).toEqual([ids[1], ids[0]]);
	});
});
