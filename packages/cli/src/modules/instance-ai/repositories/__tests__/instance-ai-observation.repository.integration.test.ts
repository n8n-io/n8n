import { getPersonalProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { createOwner } from '@test-integration/db/users';

import { InstanceAiObservationRepository } from '../instance-ai-observation.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

/**
 * `findActiveForThread` feeds the eval memory endpoint. A superseded or dropped
 * row is no longer what the agent remembers, and order is what a judge reads as
 * the story, so both are pinned against a real database.
 */
describe('InstanceAiObservationRepository', () => {
	let repository: InstanceAiObservationRepository;

	const THREAD = '11111111-1111-4111-8111-111111111111';
	const OTHER_THREAD = '22222222-2222-4222-8222-222222222222';

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		repository = Container.get(InstanceAiObservationRepository);
		// Observations hang off a thread, and a thread off a project.
		const project = await getPersonalProject(await createOwner());
		const threads = Container.get(InstanceAiThreadRepository);
		await threads.save(
			[THREAD, OTHER_THREAD].map((id) =>
				threads.create({ id, resourceId: `res-${id}`, projectId: project.id, title: '' }),
			),
		);
	});

	afterEach(async () => {
		// Not in the shared truncate list; a module table cleans up through its repository.
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function row(
		text: string,
		status: 'active' | 'superseded' | 'dropped',
		createdAt: string,
		scope = THREAD,
	) {
		return repository.create({
			observationScopeId: scope,
			marker: 'info' as const,
			text,
			parentId: null,
			tokenCount: 3,
			status,
			supersededBy: null,
			createdAt: new Date(createdAt),
		});
	}

	it('returns only the live rows of the thread, oldest first', async () => {
		await repository.save([
			row('third', 'active', '2026-01-01T00:00:03.000Z'),
			row('first', 'active', '2026-01-01T00:00:01.000Z'),
			row('replaced', 'superseded', '2026-01-01T00:00:02.000Z'),
			row('forgotten', 'dropped', '2026-01-01T00:00:02.500Z'),
			row('elsewhere', 'active', '2026-01-01T00:00:00.000Z', OTHER_THREAD),
		]);

		const rows = await repository.findActiveForThread(THREAD);

		expect(rows.map((r) => r.text)).toEqual(['first', 'third']);
	});

	it('returns an empty list when the observer never ran', async () => {
		expect(await repository.findActiveForThread(THREAD)).toEqual([]);
	});
});
