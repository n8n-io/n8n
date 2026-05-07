import type { TagEntity } from '@n8n/db';

import { TagSerializer } from '../tag.serializer';

describe('TagSerializer', () => {
	const serializer = new TagSerializer();

	it('should serialize id and name', () => {
		const tag = {
			id: 'tag-1',
			name: 'production',
			createdAt: new Date(),
			updatedAt: new Date(),
		} as TagEntity;

		expect(serializer.serialize(tag)).toEqual({ id: 'tag-1', name: 'production' });
	});

	it('should omit timestamps and relations', () => {
		const tag = {
			id: 'tag-1',
			name: 'production',
			createdAt: new Date(),
			updatedAt: new Date(),
			workflows: [],
			workflowMappings: [],
			folderMappings: [],
		} as unknown as TagEntity;

		const result = serializer.serialize(tag);

		expect(Object.keys(result)).toEqual(['id', 'name']);
	});
});
