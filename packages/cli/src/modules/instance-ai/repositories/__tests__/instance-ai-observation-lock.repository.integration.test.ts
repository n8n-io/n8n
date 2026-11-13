import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource, type Repository } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { InstanceAiObservationLock } from '../../entities/instance-ai-observation-lock.entity';
import { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import { TypeORMObservationLogStore } from '../../storage/typeorm-observation-log-store';
import type { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import type { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';
import { InstanceAiObservationLockRepository } from '../instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../instance-ai-observation.repository';

describe('InstanceAiObservationLockRepository', () => {
	let repository: InstanceAiObservationLockRepository;
	let rows: Repository<InstanceAiObservationLock>;
	let store: TypeORMObservationLogStore;
	const scope = '11111111-1111-4111-8111-111111111111';
	const otherScope = '22222222-2222-4222-8222-222222222222';
	const newScope = '33333333-3333-4333-8333-333333333333';
	const now = new Date('2026-01-01T00:00:00.000Z');
	const heldUntil = new Date(now.getTime() + 1000);

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		const project = await createTeamProject();
		await Container.get(DataSource)
			.getRepository(InstanceAiThread)
			.insert(
				[scope, otherScope, newScope].map((id) => ({
					id,
					resourceId: 'user-1',
					projectId: project.id,
					title: '',
				})),
			);
		repository = Container.get(InstanceAiObservationLockRepository);
		rows = Container.get(DataSource).getRepository(InstanceAiObservationLock);
		store = new TypeORMObservationLogStore(
			mock<InstanceAiObservationRepository>(),
			mock<InstanceAiObservationCursorRepository>(),
			repository,
			mock<InstanceAiMessageRepository>(),
			() => undefined,
		);
	});

	afterEach(async () => {
		await rows.clear();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('allows one competing holder and releases only its lock', async () => {
		const handles = await Promise.all(
			['holder-1', 'holder-2'].map(
				async (holderId) =>
					await store.acquireObservationLogTaskLock(scope, 'observer', { ttlMs: 60_000, holderId }),
			),
		);
		expect(handles.filter(Boolean)).toHaveLength(1);
		const handle = handles.find((value) => value !== null)!;
		expect(await rows.find()).toEqual([expect.objectContaining(handle)]);

		await store.releaseObservationLogTaskLock({ ...handle, holderId: 'other-holder' });
		expect(await rows.count()).toBe(1);
		await store.releaseObservationLogTaskLock(handle);
		expect(await rows.count()).toBe(0);
		await expect(store.releaseObservationLogTaskLock(handle)).resolves.toBeUndefined();
	});

	it('keeps an existing row unchanged on insert and scopes reads and deletes to its holder', async () => {
		await repository.insertIfAbsent(scope, 'observer', 'holder-1', heldUntil, {});
		const original = await rows.findOneByOrFail({
			observationScopeId: scope,
			taskKind: 'observer',
		});
		await repository.insertIfAbsent(scope, 'observer', 'holder-2', now, {});
		await repository.insertIfAbsent(scope, 'reflector', 'holder-1', heldUntil, {});
		await repository.insertIfAbsent(otherScope, 'observer', 'holder-1', heldUntil, {});

		expect(await repository.findByScopeKindAndHolder(scope, 'observer', 'holder-1', {})).toEqual(
			original,
		);
		expect(await repository.findByScopeKindAndHolder(scope, 'observer', 'holder-2', {})).toBeNull();
		await repository.deleteByScopeKindAndHolder(scope, 'observer', 'holder-2', {});
		expect(await rows.count()).toBe(3);
		await repository.deleteByScopeKindAndHolder(scope, 'observer', 'holder-1', {});
		expect(await rows.find()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ observationScopeId: scope, taskKind: 'reflector' }),
				expect.objectContaining({ observationScopeId: otherScope, taskKind: 'observer' }),
			]),
		);
		expect(await rows.count()).toBe(2);
	});

	it('renews the same holder and lets another holder claim at expiry', async () => {
		expect(
			await repository.updateIfAvailable(scope, 'observer', 'holder-1', heldUntil, now, {}),
		).toBe(false);
		await repository.insertIfAbsent(scope, 'observer', 'holder-1', heldUntil, {});
		await repository.insertIfAbsent(scope, 'reflector', 'holder-1', now, {});
		await repository.insertIfAbsent(otherScope, 'observer', 'holder-1', now, {});
		const renewedUntil = new Date(heldUntil.getTime() + 1000);
		expect(
			await repository.updateIfAvailable(scope, 'observer', 'holder-1', renewedUntil, now, {}),
		).toBe(true);
		const renewed = await repository.findByScopeKindAndHolder(scope, 'observer', 'holder-1', {});
		expect(renewed).toMatchObject({ heldUntil: renewedUntil });
		expect(
			await repository.updateIfAvailable(scope, 'observer', 'holder-2', heldUntil, now, {}),
		).toBe(false);
		expect(await repository.findByScopeKindAndHolder(scope, 'observer', 'holder-1', {})).toEqual(
			renewed,
		);

		const nextExpiry = new Date(renewedUntil.getTime() + 1000);
		expect(
			await repository.updateIfAvailable(
				scope,
				'observer',
				'holder-2',
				nextExpiry,
				renewedUntil,
				{},
			),
		).toBe(true);
		expect(
			await repository.findByScopeKindAndHolder(scope, 'observer', 'holder-2', {}),
		).toMatchObject({ heldUntil: nextExpiry });
		expect(
			await rows.findOneByOrFail({ observationScopeId: scope, taskKind: 'reflector' }),
		).toMatchObject({
			holderId: 'holder-1',
			heldUntil: now,
		});
		expect(
			await rows.findOneByOrFail({ observationScopeId: otherScope, taskKind: 'observer' }),
		).toMatchObject({ holderId: 'holder-1', heldUntil: now });
	});

	it('uses the supplied transaction for every query and rolls back all writes', async () => {
		await repository.insertIfAbsent(scope, 'observer', 'holder-1', now, {});
		await repository.insertIfAbsent(otherScope, 'observer', 'holder-1', heldUntil, {});
		const original = await rows.find({ order: { observationScopeId: 'ASC' } });
		const failure = new Error('Roll back lock changes');

		await expect(
			Container.get(TransactionRunner).run({}, async (ctx) => {
				await repository.insertIfAbsent(newScope, 'reflector', 'holder-2', heldUntil, ctx);
				expect(
					await repository.findByScopeKindAndHolder(newScope, 'reflector', 'holder-2', ctx),
				).toMatchObject({ heldUntil });
				expect(
					await repository.updateIfAvailable(scope, 'observer', 'holder-2', heldUntil, now, ctx),
				).toBe(true);
				expect(
					await repository.findByScopeKindAndHolder(scope, 'observer', 'holder-2', ctx),
				).toMatchObject({ heldUntil });
				await repository.deleteByScopeKindAndHolder(otherScope, 'observer', 'holder-1', ctx);
				expect(
					await repository.findByScopeKindAndHolder(otherScope, 'observer', 'holder-1', ctx),
				).toBeNull();
				throw failure;
			}),
		).rejects.toBe(failure);

		expect(await rows.find({ order: { observationScopeId: 'ASC' } })).toEqual(original);
	});
});
