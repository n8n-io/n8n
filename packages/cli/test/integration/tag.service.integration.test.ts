import { testDb } from '@n8n/backend-test-utils';
import { TagRepository, TransactionRunner } from '@n8n/db';
import { Container } from '@n8n/di';

import { TagService } from '@/services/tag.service';

describe('TagService.findOrCreateByNamesInTransaction', () => {
	let tagService: TagService;
	let tagRepository: TagRepository;
	let txRunner: TransactionRunner;

	beforeAll(async () => {
		await testDb.init();
		tagService = Container.get(TagService);
		tagRepository = Container.get(TagRepository);
		txRunner = Container.get(TransactionRunner);
	});

	afterEach(async () => {
		await testDb.truncate(['TagEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('creates missing tags and returns existing ones in request order', async () => {
		const existing = await tagRepository.save(tagRepository.create({ name: 'production' }));

		const { tags, created } = await txRunner.run(
			{},
			async (ctx) =>
				await tagService.findOrCreateByNamesInTransaction(['critical', ' production '], ctx),
		);

		expect(tags.map((tag) => tag.name)).toEqual(['critical', 'production']);
		expect(tags[1].id).toBe(existing.id);
		expect(created.map((tag) => tag.name)).toEqual(['critical']);
		expect(await tagRepository.findOneBy({ name: 'critical' })).not.toBeNull();
	});

	test('keeps no tag when the transaction rolls back', async () => {
		const rollback = new Error('rejected save');

		await expect(
			txRunner.run({}, async (ctx) => {
				await tagService.findOrCreateByNamesInTransaction(['critical'], ctx);
				throw rollback;
			}),
		).rejects.toBe(rollback);

		expect(await tagRepository.findOneBy({ name: 'critical' })).toBeNull();
	});

	test('returns the stored tag when the name already exists at insert time', async () => {
		const raced = await tagRepository.save(tagRepository.create({ name: 'critical' }));
		// Hide the stored row from the first lookup, as if another writer inserted it
		// between the lookup and the insert.
		vi.spyOn(tagRepository, 'findManyByName').mockResolvedValueOnce([]);

		const { tags, created } = await txRunner.run(
			{},
			async (ctx) => await tagService.findOrCreateByNamesInTransaction(['critical'], ctx),
		);

		expect(tags.map((tag) => tag.id)).toEqual([raced.id]);
		expect(created).toEqual([]);
		expect(await tagRepository.countBy({ name: 'critical' })).toBe(1);
	});
});
