import type { TagEntity, TagRepository } from '@n8n/db';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { FindOperator, QueryFailedError } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';

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
		jest.resetAllMocks();
	});

	describe('listWithUsageCount', () => {
		test('builds a limited ordered query and returns data + totalCount in parallel', async () => {
			const limitFn = jest.fn().mockReturnThis();
			const orderByFn = jest.fn().mockReturnThis();
			const orderByCallOrder: jest.Mock = orderByFn;
			const limitCallOrder: jest.Mock = limitFn;
			const getMany = jest.fn().mockResolvedValue([makeTag()]);
			const builder = {
				select: jest.fn().mockReturnThis(),
				loadRelationCountAndMap: jest.fn().mockReturnThis(),
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
			const orderByFn = jest.fn().mockReturnThis();
			const builder = {
				select: jest.fn().mockReturnThis(),
				loadRelationCountAndMap: jest.fn().mockReturnThis(),
				orderBy: orderByFn,
				limit: jest.fn().mockReturnThis(),
				getMany: jest.fn().mockResolvedValue([]),
			};
			tagRepository.createQueryBuilder.mockReturnValue(builder as never);

			await tagService.getAll({ withUsageCount: true });

			expect(orderByFn).not.toHaveBeenCalled();
		});
	});

	describe('findByNames', () => {
		test('returns existing tags by name, preserving input order', async () => {
			const tags = [
				makeTag({ id: 'tag-1', name: 'production' }),
				makeTag({ id: 'tag-2', name: 'critical' }),
			];
			tagRepository.find.mockResolvedValue(tags);

			const result = await tagService.findByNames(['critical', 'production', 'missing']);

			expect(result.map((t) => t.name)).toEqual(['critical', 'production']);
			expect(tagRepository.save).not.toHaveBeenCalled();
		});

		test('returns empty for whitespace-only inputs without querying', async () => {
			const result = await tagService.findByNames(['', '   ']);

			expect(result).toEqual([]);
			expect(tagRepository.find).not.toHaveBeenCalled();
		});
	});

	describe('findOrCreateByNames', () => {
		test('returns empty array for empty input', async () => {
			const result = await tagService.findOrCreateByNames([]);

			expect(result).toEqual([]);
			expect(tagRepository.find).not.toHaveBeenCalled();
		});

		test('returns empty array when all inputs are whitespace', async () => {
			const result = await tagService.findOrCreateByNames(['', '   ']);

			expect(result).toEqual([]);
			expect(tagRepository.find).not.toHaveBeenCalled();
		});

		test('returns existing tags without creating', async () => {
			const existing = [
				makeTag({ id: 'tag-1', name: 'production' }),
				makeTag({ id: 'tag-2', name: 'critical' }),
			];
			tagRepository.find.mockResolvedValue(existing);

			const result = await tagService.findOrCreateByNames(['production', 'critical']);

			expect(result.map((t) => t.id)).toEqual(['tag-1', 'tag-2']);
			expect(tagRepository.save).not.toHaveBeenCalled();
		});

		test('deduplicates the input case-insensitively before lookup', async () => {
			tagRepository.find.mockResolvedValue([]);
			const createdTag = makeTag({ id: 'tag-new', name: 'Prod' });
			tagRepository.create.mockReturnValue(createdTag);
			tagRepository.save.mockResolvedValue(createdTag);

			const result = await tagService.findOrCreateByNames(['Prod', 'prod', 'PROD']);

			expect(tagRepository.find).toHaveBeenCalledTimes(1);
			const findArg = tagRepository.find.mock.calls[0][0] as unknown as {
				where: { name: FindOperator<string[]> };
			};
			expect(findArg.where.name).toBeInstanceOf(FindOperator);
			expect(findArg.where.name.value).toEqual(['Prod']);
			// One create using the first-seen original case.
			expect(tagRepository.save).toHaveBeenCalledTimes(1);
			expect(tagRepository.create).toHaveBeenCalledWith({ name: 'Prod' });
			expect(result.map((t) => t.name)).toEqual(['Prod']);
		});

		test('matches the DB case-sensitively (parity with REST tags API)', async () => {
			tagRepository.find.mockResolvedValue([makeTag({ id: 'tag-1', name: 'Production' })]);
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
			tagRepository.find.mockResolvedValue([]);
			const racedTag = makeTag({ id: 'tag-raced', name: 'critical' });

			tagRepository.create.mockReturnValue(racedTag);
			tagRepository.save.mockRejectedValueOnce(uniqueViolationError('23505'));
			tagRepository.findOneBy.mockResolvedValue(racedTag);

			const result = await tagService.findOrCreateByNames(['critical']);

			expect(result).toEqual([racedTag]);
			expect(tagRepository.findOneBy).toHaveBeenCalledWith({ name: 'critical' });
		});

		test('recognises sqlite unique-constraint code', async () => {
			tagRepository.find.mockResolvedValue([]);
			const racedTag = makeTag({ id: 'tag-raced', name: 'critical' });

			tagRepository.create.mockReturnValue(racedTag);
			tagRepository.save.mockRejectedValueOnce(uniqueViolationError('SQLITE_CONSTRAINT_UNIQUE'));
			tagRepository.findOneBy.mockResolvedValue(racedTag);

			const result = await tagService.findOrCreateByNames(['critical']);

			expect(result).toEqual([racedTag]);
		});

		test('rethrows unrelated QueryFailedError instead of masking it as a race', async () => {
			tagRepository.find.mockResolvedValue([]);
			tagRepository.create.mockReturnValue(makeTag({ name: 'critical' }));
			const unrelated = new QueryFailedError('insert', undefined, new Error('connection lost'));
			tagRepository.save.mockRejectedValueOnce(unrelated);

			await expect(tagService.findOrCreateByNames(['critical'])).rejects.toBe(unrelated);
			expect(tagRepository.findOneBy).not.toHaveBeenCalled();
		});

		test('rethrows when the loser of the race cannot find the row afterwards', async () => {
			tagRepository.find.mockResolvedValue([]);
			tagRepository.create.mockReturnValue(makeTag({ name: 'critical' }));
			const err = uniqueViolationError('23505');
			tagRepository.save.mockRejectedValueOnce(err);
			tagRepository.findOneBy.mockResolvedValue(null);

			await expect(tagService.findOrCreateByNames(['critical'])).rejects.toBe(err);
		});

		test('creates missing tags and merges with existing', async () => {
			tagRepository.find.mockResolvedValue([makeTag({ id: 'tag-1', name: 'production' })]);
			const createdTag = makeTag({ id: 'tag-new', name: 'critical' });
			tagRepository.create.mockReturnValue(createdTag);
			tagRepository.save.mockResolvedValue(createdTag);

			const result = await tagService.findOrCreateByNames(['production', 'critical']);

			expect(result.map((t) => t.name)).toEqual(['production', 'critical']);
			expect(tagRepository.save).toHaveBeenCalledTimes(1);
		});
	});
});
