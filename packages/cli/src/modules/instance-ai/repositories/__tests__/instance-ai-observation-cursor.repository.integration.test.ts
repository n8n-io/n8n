import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';

import { InstanceAiObservationCursor } from '../../entities/instance-ai-observation-cursor.entity';
import { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';

describe('InstanceAiObservationCursorRepository', () => {
	let repository: InstanceAiObservationCursorRepository;
	let rows: Repository<InstanceAiObservationCursor>;
	const scope = '11111111-1111-4111-8111-111111111111';
	const otherScope = '22222222-2222-4222-8222-222222222222';
	const cursor = {
		observationScopeId: scope,
		lastObservedMessageId: 'message-1',
		lastObservedAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-01T00:01:00.000Z'),
	};

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		const project = await createTeamProject();
		await Container.get(DataSource)
			.getRepository(InstanceAiThread)
			.insert(
				[scope, otherScope].map((id) => ({
					id,
					resourceId: 'user-1',
					projectId: project.id,
					title: '',
				})),
			);
		repository = Container.get(InstanceAiObservationCursorRepository);
		rows = Container.get(DataSource).getRepository(InstanceAiObservationCursor);
	});

	afterEach(async () => {
		await rows.clear();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('returns null for a missing thread cursor and keeps reads scoped to the thread', async () => {
		expect(await repository.findForThread(scope, {})).toBeNull();
		await repository.upsertForThread(cursor, {});
		expect(await repository.findForThread(scope, {})).toEqual(
			await rows.findOneByOrFail({ observationScopeId: scope }),
		);
		expect(await repository.findForThread(otherScope, {})).toBeNull();
	});

	it('updates an existing cursor without replacing its creation time or another thread', async () => {
		await repository.upsertForThread(cursor, {});
		await repository.upsertForThread({ ...cursor, observationScopeId: otherScope }, {});
		const original = await rows.findOneByOrFail({ observationScopeId: scope });
		const other = await rows.findOneByOrFail({ observationScopeId: otherScope });
		const next = {
			...cursor,
			lastObservedMessageId: 'message-2',
			lastObservedAt: new Date('2026-01-01T00:02:00.000Z'),
			updatedAt: new Date('2026-01-01T00:03:00.000Z'),
		};

		await expect(repository.upsertForThread(next, {})).resolves.toBeUndefined();
		await repository.upsertForThread(next, {});

		expect(await repository.findForThread(scope, {})).toEqual({ ...original, ...next });
		expect(await repository.findForThread(otherScope, {})).toEqual(other);
		expect(await rows.count()).toBe(2);
	});

	it('uses the supplied transaction for reads and rolls back inserted and updated cursors', async () => {
		await repository.upsertForThread(cursor, {});
		const original = await rows.findOneByOrFail({ observationScopeId: scope });
		const failure = new Error('Roll back cursor changes');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await repository.upsertForThread({ ...cursor, lastObservedMessageId: 'message-2' }, ctx);
				await repository.upsertForThread({ ...cursor, observationScopeId: otherScope }, ctx);
				expect(await repository.findForThread(scope, ctx)).toMatchObject({
					lastObservedMessageId: 'message-2',
				});
				expect(await repository.findForThread(otherScope, ctx)).toMatchObject({
					...cursor,
					observationScopeId: otherScope,
				});
				throw failure;
			}),
		).rejects.toBe(failure);

		expect(await repository.findForThread(scope, {})).toEqual(original);
		expect(await repository.findForThread(otherScope, {})).toBeNull();
	});
});
