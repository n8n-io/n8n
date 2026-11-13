import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { InstanceAiObservationCursor } from '../../entities/instance-ai-observation-cursor.entity';
import { InstanceAiThread } from '../../entities/instance-ai-thread.entity';
import { TypeORMObservationLogStore } from '../../storage/typeorm-observation-log-store';
import type { InstanceAiMessageRepository } from '../instance-ai-message.repository';
import { InstanceAiObservationCursorRepository } from '../instance-ai-observation-cursor.repository';
import type { InstanceAiObservationLockRepository } from '../instance-ai-observation-lock.repository';
import type { InstanceAiObservationRepository } from '../instance-ai-observation.repository';

describe('TypeORMObservationLogStore resume state', () => {
	let store: TypeORMObservationLogStore;
	const scope = '44444444-4444-4444-8444-444444444444';
	const noCursorScope = '55555555-5555-4555-8555-555555555555';
	const cursor = {
		observationScopeId: scope,
		lastObservedMessageId: 'm2',
		lastObservedAt: new Date('2026-01-01T00:00:02.000Z'),
		updatedAt: new Date('2026-01-01T00:00:03.000Z'),
	};
	const state = {
		observationScopeId: scope,
		resumeFrom: {
			lastObservedMessageId: 'm1',
			lastObservedAt: new Date('2026-01-01T00:00:01.000Z'),
		},
		resumeNotes: '* IMPORTANT Keep the prior decision.',
		lastRequestTokens: 12_345,
		lastModelId: 'anthropic/claude-sonnet-4-5',
	};

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		const project = await createTeamProject();
		await Container.get(DataSource)
			.getRepository(InstanceAiThread)
			.insert(
				[scope, noCursorScope].map((id) => ({
					id,
					resourceId: 'user-1',
					projectId: project.id,
					title: '',
				})),
			);
		store = new TypeORMObservationLogStore(
			mock<InstanceAiObservationRepository>(),
			Container.get(InstanceAiObservationCursorRepository),
			mock<InstanceAiObservationLockRepository>(),
			mock<InstanceAiMessageRepository>(),
			() => undefined,
		);
	});

	afterEach(async () => {
		await Container.get(DataSource).getRepository(InstanceAiObservationCursor).clear();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('round-trips every resume column and keeps the cursor', async () => {
		await store.setCursor(cursor);

		await store.saveResumeState(state);

		expect(await store.getResumeState(scope)).toEqual(state);
		expect(await store.getCursor(scope)).toEqual(cursor);
	});

	it('round-trips an empty resume state', async () => {
		await store.setCursor(cursor);
		const empty = {
			observationScopeId: scope,
			resumeFrom: null,
			resumeNotes: null,
			lastRequestTokens: null,
			lastModelId: null,
		};

		await store.saveResumeState(state);
		await store.saveResumeState(empty);

		expect(await store.getResumeState(scope)).toEqual(empty);
	});

	it('does not save resume state for a thread without a cursor', async () => {
		await store.saveResumeState({ ...state, observationScopeId: noCursorScope });

		expect(await store.getResumeState(noCursorScope)).toBeNull();
	});

	it('saves over a cursor that an Observer commit moved', async () => {
		await store.setCursor(cursor);
		await store.saveResumeState(state);
		const moved = {
			...cursor,
			lastObservedMessageId: 'm3',
			updatedAt: new Date('2026-01-01T00:00:04.000Z'),
		};
		await store.setCursor(moved);

		await store.saveResumeState({ ...state, lastRequestTokens: 999 });

		expect(await store.getResumeState(scope)).toMatchObject({ lastRequestTokens: 999 });
		expect(await store.getCursor(scope)).toEqual(moved);
	});
});
