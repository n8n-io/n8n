import { findMatches, removeIgnored } from '../../v2/helpers/utils';

describe('test AirtableV2, removeIgnored', () => {
	it('should remove ignored fields', () => {
		const data = {
			foo: 'foo',
			baz: 'baz',
			spam: 'spam',
		};

		const ignore = 'baz,spam';

		const result = removeIgnored(data, ignore);

		expect(result).toEqual({
			foo: 'foo',
		});
	});
	it('should return the same data if ignore field does not present', () => {
		const data = {
			foo: 'foo',
		};

		const ignore = 'bar';

		const result = removeIgnored(data, ignore);

		expect(result).toEqual(data);
	});
	it('should return the same data if empty string', () => {
		const data = {
			foo: 'foo',
		};

		const ignore = '';

		const result = removeIgnored(data, ignore);

		expect(result).toEqual(data);
	});
});

describe('test AirtableV2, findMatches', () => {
	it('should find match', () => {
		const data = [
			{
				fields: {
					id: 'rec123',
					data: 'data 1',
				},
			},
			{
				fields: {
					id: 'rec456',
					data: 'data 2',
				},
			},
		];

		const key = 'id';

		const result = findMatches(data, [key], {
			id: 'rec123',
			data: 'data 1',
		});

		expect(result).toEqual([
			{
				fields: {
					id: 'rec123',
					data: 'data 1',
				},
			},
		]);
	});
	it('should find all matches', () => {
		const data = [
			{
				fields: {
					id: 'rec123',
					data: 'data 1',
				},
			},
			{
				fields: {
					id: 'rec456',
					data: 'data 2',
				},
			},
			{
				fields: {
					id: 'rec123',
					data: 'data 3',
				},
			},
		];

		const key = 'id';

		const result = findMatches(
			data,
			[key],
			{
				id: 'rec123',
				data: 'data 1',
			},
			true,
		);

		expect(result).toEqual([
			{
				fields: {
					id: 'rec123',
					data: 'data 1',
				},
			},
			{
				fields: {
					id: 'rec123',
					data: 'data 3',
				},
			},
		]);
	});
});
