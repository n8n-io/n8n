import type { Mock } from 'vitest';
import type { TagEntity, TagRepository } from '@n8n/db';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type { ExternalHooks } from '@/external-hooks';
import { TagService } from '@/services/tag.service';

const makeTag = (overrides: Partial<TagEntity> = {}): TagEntity =>
	({
		id: 'tag-id',
		name: 'tag',
		createdAt: new Date('2026-01-01'),
		updatedAt: new Date('2026-01-01'),
		...overrides,
	}) as TagEntity;

describe('TagService', () => {
	const tagRepository = mock<TagRepository>();
	const externalHooks = mock<ExternalHooks>();
	const tagService = new TagService(externalHooks, tagRepository);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('listWithUsageCount', () => {
		test('builds a limited ordered query and returns data + totalCount in parallel', async () => {
			const limitFn = vi.fn().mockReturnThis();
			const orderByFn = vi.fn().mockReturnThis();
			const orderByCallOrder: Mock = orderByFn;
			const limitCallOrder: Mock = limitFn;
			const getMany = vi.fn().mockResolvedValue([makeTag()]);
			const builder = {
				select: vi.fn().mockReturnThis(),
				loadRelationCountAndMap: vi.fn().mockReturnThis(),
				orderBy: orderByFn,
				limit: limitFn,
				getMany,
			};
			tagRepository.createQueryBuilder.mockReturnValue(builder as never);
			tagRepository.count.mockResolvedValue(42);

			const result = await tagService.listWithUsageCount({ limit: 10 });

			expect(orderByFn).toHaveBeenCalledWith('tag.name', 'ASC');
			expect(limitFn).toHaveBeenCalledWith(10);
			// orderBy must run before limit, or generated SQL is invalid
			expect(orderByCallOrder.mock.invocationCallOrder[0]).toBeLessThan(
				limitCallOrder.mock.invocationCallOrder[0],
			);
			expect(tagRepository.count).toHaveBeenCalledTimes(1);
			expect(result.totalCount).toBe(42);
			expect(result.data).toHaveLength(1);
		});

		test('does not order when called via getAll without orderByName', async () => {
			const orderByFn = vi.fn().mockReturnThis();
			const builder = {
				select: vi.fn().mockReturnThis(),
				loadRelationCountAndMap: vi.fn().mockReturnThis(),
				orderBy: orderByFn,
				limit: vi.fn().mockReturnThis(),
				getMany: vi.fn().mockResolvedValue([]),
			};
			tagRepository.createQueryBuilder.mockReturnValue(builder as never);

			await tagService.getAll({ withUsageCount: true });

			expect(orderByFn).not.toHaveBeenCalled();
		});
	});

	describe('findOrCreateByNames', () => {
		test('returns empty array for empty input', async () => {
			const result = await tagService.findOrCreateByNames([]);

			expect(result).toEqual([]);
			expect(tagRepository.findManyByName).not.toHaveBeenCalled();
		});

		test('returns empty array when all inputs are whitespace', async () => {
			const result = await tagService.findOrCreateByNames(['', '   ']);

			expect(result).toEqual([]);
			expect(tagRepository.findManyByName).not.toHaveBeenCalled();
		});

		test('returns existing tags without creating', async () => {
			const existing = [
				makeTag({ id: 'tag-1', name: 'production' }),
				makeTag({ id: 'tag-2', name: 'critical' }),
			];
			tagRepository.findManyByName.mockResolvedValue(existing);

			const result = await tagService.findOrCreateByNames(['production', 'critical']);

			expect(result.map((t) => t.id)).toEqual(['tag-1', 'tag-2']);
			expect(tagRepository.save).not.toHaveBeenCalled();
		});

		test('trims names and collapses exact duplicates before lookup', async () => {
			tagRepository.findManyByName.mockResolvedValue([]);
			const createdTag = makeTag({ id: 'tag-new', name: 'prod' });
			tagRepository.create.mockReturnValue(createdTag);
			tagRepository.save.mockResolvedValue(createdTag);

			const result = await tagService.findOrCreateByNames(['  prod ', 'prod']);

			expect(tagRepository.findManyByName).toHaveBeenCalledTimes(1);
			expect(tagRepository.findManyByName).toHaveBeenCalledWith(['prod']);
			expect(tagRepository.save).toHaveBeenCalledTimes(1);
			expect(result.map((t) => t.name)).toEqual(['prod']);
		});

		test('creates case-variant names as distinct tags', async () => {
			tagRepository.findManyByName.mockResolvedValue([]);
			tagRepository.create.mockImplementation((attrs) => makeTag(attrs as Partial<TagEntity>));
			tagRepository.save.mockImplementation(async (tag) => tag as TagEntity);

			const result = await tagService.findOrCreateByNames(['Prod', 'prod']);

			expect(tagRepository.save).toHaveBeenCalledTimes(2);
			expect(result.map((t) => t.name)).toEqual(['Prod', 'prod']);
		});

		test('matches the DB case-sensitively (parity with REST tags API)', async () => {
			tagRepository.findManyByName.mockResolvedValue([
				makeTag({ id: 'tag-1', name: 'Production' }),
			]);
			const createdTag = makeTag({ id: 'tag-new', name: 'production' });
			tagRepository.create.mockReturnValue(createdTag);
			tagRepository.save.mockResolvedValue(createdTag);

			// 'Production' exists in DB; user asks for 'production' — the existing
			// REST contract lets these coexist, so MCP creates a new tag too.
			const result = await tagService.findOrCreateByNames(['production']);

			expect(tagRepository.save).toHaveBeenCalledTimes(1);
			expect(tagRepository.create).toHaveBeenCalledWith({ name: 'production' });
			expect(result.map((t) => t.id)).toEqual(['tag-new']);
		});

		const uniqueViolationError = (code: string | number) => {
			const driver = Object.assign(new Error('duplicate key'), { code });
			return new QueryFailedError('insert', undefined, driver);
		};

		test('returns the now-existing row when a concurrent caller wins the create race (postgres)', async () => {
			tagRepository.findManyByName.mockResolvedValue([]);
			const racedTag = makeTag({ id: 'tag-raced', name: 'critical' });

			tagRepository.create.mockReturnValue(racedTag);
			tagRepository.save.mockRejectedValueOnce(uniqueViolationError('23505'));
			tagRepository.findOneBy.mockResolvedValue(racedTag);

			const result = await tagService.findOrCreateByNames(['critical']);

			expect(result).toEqual([racedTag]);
			expect(tagRepository.findOneBy).toHaveBeenCalledWith({ name: 'critical' });
		});

		test('recognises sqlite unique-constraint code', async () => {
			tagRepository.findManyByName.mockResolvedValue([]);
			const racedTag = makeTag({ id: 'tag-raced', name: 'critical' });

			tagRepository.create.mockReturnValue(racedTag);
			tagRepository.save.mockRejectedValueOnce(uniqueViolationError('SQLITE_CONSTRAINT_UNIQUE'));
			tagRepository.findOneBy.mockResolvedValue(racedTag);

			const result = await tagService.findOrCreateByNames(['critical']);

			expect(result).toEqual([racedTag]);
		});

		test('rethrows unrelated QueryFailedError instead of masking it as a race', async () => {
			tagRepository.findManyByName.mockResolvedValue([]);
			tagRepository.create.mockReturnValue(makeTag({ name: 'critical' }));
			const unrelated = new QueryFailedError('insert', undefined, new Error('connection lost'));
			tagRepository.save.mockRejectedValueOnce(unrelated);

			await expect(tagService.findOrCreateByNames(['critical'])).rejects.toBe(unrelated);
			expect(tagRepository.findOneBy).not.toHaveBeenCalled();
		});

		test('rethrows when the loser of the race cannot find the row afterwards', async () => {
			tagRepository.findManyByName.mockResolvedValue([]);
			tagRepository.create.mockReturnValue(makeTag({ name: 'critical' }));
			const err = uniqueViolationError('23505');
			tagRepository.save.mockRejectedValueOnce(err);
			tagRepository.findOneBy.mockResolvedValue(null);

			await expect(tagService.findOrCreateByNames(['critical'])).rejects.toBe(err);
		});

		test('creates missing tags and merges with existing', async () => {
			tagRepository.findManyByName.mockResolvedValue([
				makeTag({ id: 'tag-1', name: 'production' }),
			]);
			const createdTag = makeTag({ id: 'tag-new', name: 'critical' });
			tagRepository.create.mockReturnValue(createdTag);
			tagRepository.save.mockResolvedValue(createdTag);

			const result = await tagService.findOrCreateByNames(['production', 'critical']);

			expect(result.map((t) => t.name)).toEqual(['production', 'critical']);
			expect(tagRepository.save).toHaveBeenCalledTimes(1);
		});
	});
});
