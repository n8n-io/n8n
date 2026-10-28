import {
	SCIM_TRANSFER_TARGETS_DEFAULT_TAKE,
	ScimTransferTargetsQueryDto,
} from '../scim-transfer-targets-query.dto';

describe('ScimTransferTargetsQueryDto', () => {
	it('uses the defaults for an empty query', () => {
		expect(ScimTransferTargetsQueryDto.parse({})).toEqual({
			skip: 0,
			take: SCIM_TRANSFER_TARGETS_DEFAULT_TAKE,
		});
	});

	it.each([
		['a search', { search: ' ada@example.com ' }, { search: 'ada@example.com' }],
		['type people', { type: 'people' }, { type: 'people' }],
		['type projects', { type: 'projects' }, { type: 'projects' }],
		['skip and take', { skip: '50', take: '25' }, { skip: 50, take: 25 }],
	])('accepts %s', (_, query, expected) => {
		expect(ScimTransferTargetsQueryDto.parse(query)).toMatchObject(expected);
	});

	it('accepts a search of 255 characters', () => {
		const search = 'a'.repeat(255);

		expect(ScimTransferTargetsQueryDto.parse({ search }).search).toBe(search);
	});

	it('treats a blank search as no search', () => {
		expect(ScimTransferTargetsQueryDto.parse({ search: '   ' }).search).toBeUndefined();
	});

	it('caps take at 250', () => {
		expect(ScimTransferTargetsQueryDto.parse({ take: '1000' }).take).toBe(250);
	});

	it.each([
		['an unknown type', { type: 'users' }],
		['a negative skip', { skip: '-1' }],
		['a negative take', { take: '-1' }],
		['a take that is not a number', { take: 'all' }],
		['a search longer than 255 characters', { search: 'a'.repeat(256) }],
	])('rejects %s', (_, query) => {
		expect(ScimTransferTargetsQueryDto.safeParse(query).success).toBe(false);
	});
});
