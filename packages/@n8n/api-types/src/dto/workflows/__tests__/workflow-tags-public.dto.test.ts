import { TagIdsPublicDto, WorkflowTagsPublicDto } from '../workflow-tags-public.dto';

describe('TagIdsPublicDto', () => {
	it('accepts an array of tag id objects', () => {
		const result = TagIdsPublicDto.safeParse([{ id: 'tag-1' }, { id: 'tag-2' }]);
		expect(result).toMatchObject({ success: true, data: [{ id: 'tag-1' }, { id: 'tag-2' }] });
	});
});

describe('WorkflowTagsPublicDto', () => {
	it('accepts a bare array of tag objects', () => {
		const tag = {
			id: 'tag-1',
			name: 'my-tag',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};

		expect(WorkflowTagsPublicDto.safeParse([tag])).toMatchObject({ success: true, data: [tag] });
	});
});
