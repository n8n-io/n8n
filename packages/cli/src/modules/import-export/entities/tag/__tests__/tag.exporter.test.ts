import type { TagEntity } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ExportScope } from '../../../import-export.types';
import type { PackageWriter } from '../../../io/package-writer';
import { TagExporter } from '../tag.exporter';
import type { TagSerializer } from '../tag.serializer';

describe('TagExporter', () => {
	let exporter: TagExporter;
	let mockSerializer: MockProxy<TagSerializer>;
	let mockWriter: MockProxy<PackageWriter>;
	let scope: ExportScope;

	const basePath = 'projects/billing-550e84';

	beforeEach(() => {
		jest.clearAllMocks();

		mockSerializer = mock<TagSerializer>();
		mockWriter = mock<PackageWriter>();

		exporter = new TagExporter(mockSerializer);

		scope = {
			basePath,
			projectId: 'project-1',
			writer: mockWriter,
			entityOptions: {},
		};
	});

	it('should return empty array when no referenced tags', async () => {
		const result = await exporter.export(scope, { referencedTags: [] });

		expect(result).toEqual([]);
		expect(mockWriter.writeDirectory).not.toHaveBeenCalled();
		expect(mockWriter.writeFile).not.toHaveBeenCalled();
	});

	it('should write referenced tags to the package', async () => {
		const tag = { id: 'tag1100-0000-0000-0000-000000000000', name: 'production' } as TagEntity;
		mockSerializer.serialize.mockReturnValue({ id: tag.id, name: tag.name });

		const result = await exporter.export(scope, { referencedTags: [tag] });

		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(tag.id);
		expect(result[0].name).toBe('production');
		expect(result[0].target).toBe('projects/billing-550e84/tags/production-tag110');

		expect(mockWriter.writeDirectory).toHaveBeenCalledWith(
			'projects/billing-550e84/tags/production-tag110',
		);
		expect(mockWriter.writeFile).toHaveBeenCalledWith(
			'projects/billing-550e84/tags/production-tag110/tag.json',
			expect.any(String),
		);
	});

	it('should serialize tag JSON to disk', async () => {
		const tag = { id: 'aaa11100-0000-0000-0000-000000000000', name: 'staging' } as TagEntity;
		const serialized = { id: tag.id, name: 'staging' };
		mockSerializer.serialize.mockReturnValue(serialized);

		await exporter.export(scope, { referencedTags: [tag] });

		const written = mockWriter.writeFile.mock.calls[0][1] as string;
		expect(JSON.parse(written)).toEqual(serialized);
	});

	it('should write multiple tags', async () => {
		const tags = [
			{ id: 'aaa11100-0000-0000-0000-000000000000', name: 'staging' },
			{ id: 'bbb22200-0000-0000-0000-000000000000', name: 'production' },
		] as TagEntity[];
		mockSerializer.serialize
			.mockReturnValueOnce({ id: tags[0].id, name: tags[0].name })
			.mockReturnValueOnce({ id: tags[1].id, name: tags[1].name });

		const result = await exporter.export(scope, { referencedTags: tags });

		expect(result).toHaveLength(2);
		expect(mockWriter.writeFile).toHaveBeenCalledTimes(2);
	});
});
