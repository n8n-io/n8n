import { findMatches, removeIgnored, mapFieldNamesToIds } from '../../v2/helpers/utils';

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

describe('test AirtableV2, mapFieldNamesToIds', () => {
	it('should map field names to field IDs', () => {
		const fieldMapping = new Map([
			['Name', 'fld1234'],
			['Email', 'fld5678'],
			['Status', 'fld9012'],
		]);

		const fields = {
			Name: 'John Doe',
			Email: 'john@example.com',
			Status: 'Active',
		};

		const result = mapFieldNamesToIds(fields, fieldMapping);

		expect(result).toEqual({
			fld1234: 'John Doe',
			fld5678: 'john@example.com',
			fld9012: 'Active',
		});
	});

	it('should keep original field name if no mapping exists', () => {
		const fieldMapping = new Map([['Name', 'fld1234']]);

		const fields = {
			Name: 'John Doe',
			UnmappedField: 'some value',
		};

		const result = mapFieldNamesToIds(fields, fieldMapping);

		expect(result).toEqual({
			fld1234: 'John Doe',
			UnmappedField: 'some value',
		});
	});

	it('should handle empty field mapping', () => {
		const fieldMapping = new Map();

		const fields = {
			Name: 'John Doe',
			Email: 'john@example.com',
		};

		const result = mapFieldNamesToIds(fields, fieldMapping);

		expect(result).toEqual({
			Name: 'John Doe',
			Email: 'john@example.com',
		});
	});
});
