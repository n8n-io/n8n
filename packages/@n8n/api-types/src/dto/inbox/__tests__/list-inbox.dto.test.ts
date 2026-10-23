import { ListInboxQueryDto } from '../list-inbox.dto';

describe('ListInboxQueryDto', () => {
	it('defaults to the first Open page', () => {
		expect(ListInboxQueryDto.parse({})).toEqual({ state: 'open', limit: 15 });
	});

	it('accepts query parameters for a Closed continuation page', () => {
		expect(ListInboxQueryDto.parse({ state: 'closed', limit: '20', cursor: 'cursor' })).toEqual({
			state: 'closed',
			limit: 20,
			cursor: 'cursor',
		});
	});

	it.each([
		{ category: 'other' },
		{ category: ['waiting', 'authored'] },
		{ state: 'pending' },
		{ state: ['open', 'closed'] },
		{ limit: 0 },
		{ limit: 101 },
		{ limit: 1.5 },
		{ cursor: '' },
		{ cursor: 'a'.repeat(2049) },
	])('rejects invalid page input %j', (query) => {
		expect(ListInboxQueryDto.safeParse(query).success).toBe(false);
	});

	it.each(['waiting', 'authored'])('accepts the %s category', (category) => {
		expect(ListInboxQueryDto.parse({ category })).toEqual({ state: 'open', limit: 15, category });
	});
});
