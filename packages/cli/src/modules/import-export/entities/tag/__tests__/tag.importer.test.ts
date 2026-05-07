import type { TagRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ImportScope } from '../../../import-export.types';
import type { PackageReader } from '../../../io/package-reader';
import { TagImporter } from '../tag.importer';

describe('TagImporter', () => {
	let importer: TagImporter;
	let mockTagRepository: MockProxy<TagRepository>;
	let mockReader: MockProxy<PackageReader>;
	let scope: ImportScope;

	beforeEach(() => {
		jest.clearAllMocks();

		mockTagRepository = mock<TagRepository>();
		mockReader = mock<PackageReader>();

		importer = new TagImporter(mockTagRepository);

		scope = {
			user: mock(),
			targetProjectId: 'target-project-1',
			reader: mockReader,
			entityOptions: {},
		};
	});

	it('should return empty map when there are no entries', async () => {
		const result = await importer.import(scope, []);

		expect(result.tagsBySourceId.size).toBe(0);
		expect(mockReader.readFile).not.toHaveBeenCalled();
	});

	it('should reuse an existing tag with the same name', async () => {
		const entry = { id: 'src-tag-1', name: 'production', target: 'tags/production-srctag1' };
		mockReader.readFile.mockReturnValue(JSON.stringify({ id: 'src-tag-1', name: 'production' }));
		mockTagRepository.findOne.mockResolvedValue({
			id: 'existing-tag',
			name: 'production',
		} as never);

		const result = await importer.import(scope, [entry]);

		expect(result.tagsBySourceId.get('src-tag-1')).toEqual({
			id: 'existing-tag',
			name: 'production',
		});
		expect(mockTagRepository.save).not.toHaveBeenCalled();
	});

	it('should create a new tag when no name match exists', async () => {
		const entry = { id: 'src-tag-1', name: 'staging', target: 'tags/staging-srctag1' };
		mockReader.readFile.mockReturnValue(JSON.stringify({ id: 'src-tag-1', name: 'staging' }));
		mockTagRepository.findOne.mockResolvedValue(null);
		mockTagRepository.create.mockReturnValue({ name: 'staging' } as never);
		mockTagRepository.save.mockResolvedValue({ id: 'new-tag-id', name: 'staging' } as never);

		const result = await importer.import(scope, [entry]);

		expect(mockTagRepository.create).toHaveBeenCalledWith({ name: 'staging' });
		expect(mockTagRepository.save).toHaveBeenCalled();
		expect(result.tagsBySourceId.get('src-tag-1')).toEqual({
			id: 'new-tag-id',
			name: 'staging',
		});
	});

	it('should handle a mix of existing and new tags', async () => {
		const entries = [
			{ id: 'src-a', name: 'staging', target: 'tags/staging' },
			{ id: 'src-b', name: 'production', target: 'tags/production' },
		];
		mockReader.readFile
			.mockReturnValueOnce(JSON.stringify({ id: 'src-a', name: 'staging' }))
			.mockReturnValueOnce(JSON.stringify({ id: 'src-b', name: 'production' }));
		mockTagRepository.findOne
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: 'existing-prod', name: 'production' } as never);
		mockTagRepository.create.mockReturnValue({ name: 'staging' } as never);
		mockTagRepository.save.mockResolvedValue({ id: 'new-staging', name: 'staging' } as never);

		const result = await importer.import(scope, entries);

		expect(result.tagsBySourceId.get('src-a')).toEqual({ id: 'new-staging', name: 'staging' });
		expect(result.tagsBySourceId.get('src-b')).toEqual({
			id: 'existing-prod',
			name: 'production',
		});
	});
});
