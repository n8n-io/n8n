import type { TagEntity, TagRepository } from '@n8n/db';
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

		test('deduplicates names before lookup', async () => {
			tagRepository.find.mockResolvedValue([makeTag({ id: 'tag-1', name: 'production' })]);

			await tagService.findOrCreateByNames(['production', 'production', '  production  ']);

			expect(tagRepository.find).toHaveBeenCalledWith({
				where: { name: expect.objectContaining({ _value: ['production'] }) },
			});
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
