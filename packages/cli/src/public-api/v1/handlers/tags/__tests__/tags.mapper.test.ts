import { toPublicTag } from '../tags.mapper';

describe('toPublicTag', () => {
	it('returns only public tag fields with UTC timestamps', () => {
		const tag = Object.freeze({
			id: 'tag-id',
			name: 'Example tag',
			createdAt: new Date('2026-01-01T10:00:00.123+02:00'),
			updatedAt: new Date('2026-01-02T10:30:00.456-03:00'),
			internalField: 'excluded',
		});

		expect(toPublicTag(tag)).toEqual({
			id: 'tag-id',
			name: 'Example tag',
			createdAt: '2026-01-01T08:00:00.123Z',
			updatedAt: '2026-01-02T13:30:00.456Z',
		});
	});
});
