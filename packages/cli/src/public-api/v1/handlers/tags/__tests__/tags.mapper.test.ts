import { toPublicTag } from '../tags.mapper';

describe('toPublicTag', () => {
	it('serializes the dates and keeps only the public fields', () => {
		const tag = {
			id: 'tag-1',
			name: 'production',
			createdAt: new Date('2026-01-01T10:00:00.000Z'),
			updatedAt: new Date('2026-01-02T10:00:00.000Z'),
			usageCount: 3,
		};

		expect(toPublicTag(tag)).toEqual({
			id: 'tag-1',
			name: 'production',
			createdAt: '2026-01-01T10:00:00.000Z',
			updatedAt: '2026-01-02T10:00:00.000Z',
		});
	});
});
