import { z } from 'zod';

import { TagIdsPublicDto, WorkflowTagsPublicDto } from '../workflow-tags-public.dto';

describe('TagIdsPublicDto', () => {
	it('accepts an array of tag id objects', () => {
		const result = TagIdsPublicDto.safeParse([{ id: 'tag-1' }, { id: 'tag-2' }]);
		expect(result).toMatchObject({ success: true, data: [{ id: 'tag-1' }, { id: 'tag-2' }] });
	});

	it('accepts an empty array', () => {
		expect(TagIdsPublicDto.safeParse([]).success).toBe(true);
	});

	it('rejects a bare object instead of an array', () => {
		expect(TagIdsPublicDto.safeParse({ id: 'tag-1' }).success).toBe(false);
	});

	it('rejects an array item missing id', () => {
		expect(TagIdsPublicDto.safeParse([{}]).success).toBe(false);
	});
});

describe('WorkflowTagsPublicDto', () => {
	const tag = {
		id: 'tag-1',
		name: 'my-tag',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
	};

	it('accepts a bare array of tag objects', () => {
		const result = WorkflowTagsPublicDto.safeParse([tag]);
		expect(result).toMatchObject({ success: true, data: [tag] });
	});

	it('accepts an empty array', () => {
		expect(WorkflowTagsPublicDto.safeParse([]).success).toBe(true);
	});

	it('is rooted at an array schema, not an object envelope', () => {
		expect(WorkflowTagsPublicDto.schema instanceof z.ZodArray).toBe(true);
	});

	it('rejects a tag missing required fields', () => {
		expect(WorkflowTagsPublicDto.safeParse([{ id: 'tag-1' }]).success).toBe(false);
	});
});
