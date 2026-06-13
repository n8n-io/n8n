import {
	coerceArrayTypeFields,
	findMatches,
	removeIgnored,
	valuesMatch,
} from '../../v2/helpers/utils';

const makeColumnsParam = (fields: Array<{ id: string; type: string }>) => ({
	mappingMode: 'defineBelow',
	schema: fields,
	value: {},
});

describe('test AirtableV2, coerceArrayTypeFields', () => {
	it('should parse a valid JSON array string into an array', () => {
		const fields = { attachments: '[{"url":"https://example.com/file.pdf"}]' };
		const columnsParam = makeColumnsParam([{ id: 'attachments', type: 'array' }]);
		coerceArrayTypeFields(fields, columnsParam);
		expect(fields.attachments).toEqual([{ url: 'https://example.com/file.pdf' }]);
	});

	it('should keep the original string if it is not valid JSON', () => {
		const fields = { attachments: 'not-json' };
		const columnsParam = makeColumnsParam([{ id: 'attachments', type: 'array' }]);
		coerceArrayTypeFields(fields, columnsParam);
		expect(fields.attachments).toBe('not-json');
	});

	it('should keep the original string if valid JSON but not an array', () => {
		const fields = { attachments: '{"url":"https://example.com"}' };
		const columnsParam = makeColumnsParam([{ id: 'attachments', type: 'array' }]);
		coerceArrayTypeFields(fields, columnsParam);
		expect(fields.attachments).toBe('{"url":"https://example.com"}');
	});

	it('should not modify non-string values', () => {
		const existingArray = [{ url: 'https://example.com' }];
		const fields = { attachments: existingArray };
		const columnsParam = makeColumnsParam([{ id: 'attachments', type: 'array' }]);
		coerceArrayTypeFields(fields, columnsParam);
		expect(fields.attachments).toBe(existingArray);
	});

	it('should not modify fields that are not array-type in schema', () => {
		const fields = { name: '[{"url":"https://example.com"}]' };
		const columnsParam = makeColumnsParam([{ id: 'name', type: 'string' }]);
		coerceArrayTypeFields(fields, columnsParam);
		expect(fields.name).toBe('[{"url":"https://example.com"}]');
	});

	it('should keep strings with apostrophes as-is when not valid JSON', () => {
		const fields = { attachments: "O'Brien.pdf" };
		const columnsParam = makeColumnsParam([{ id: 'attachments', type: 'array' }]);
		coerceArrayTypeFields(fields, columnsParam);
		expect(fields.attachments).toBe("O'Brien.pdf");
	});

	it('should do nothing if columnsParam is not a resource mapper value', () => {
		const fields = { attachments: '[{"url":"https://example.com"}]' };
		coerceArrayTypeFields(fields, null);
		expect(fields.attachments).toBe('[{"url":"https://example.com"}]');
	});
});

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

	it('should find match when record field value is an array and input is a scalar', () => {
		const data = [
			{
				fields: {
					lookupField: ['value1'],
					data: 'data 1',
				},
			},
			{
				fields: {
					lookupField: ['value2'],
					data: 'data 2',
				},
			},
		];

		const result = findMatches(data, ['lookupField'], {
			lookupField: 'value1',
			data: 'updated',
		});

		expect(result).toEqual([
			{
				fields: {
					lookupField: ['value1'],
					data: 'data 1',
				},
			},
		]);
	});

	it('should find all matches when record field values are arrays and input is a scalar', () => {
		const data = [
			{
				fields: {
					lookupField: ['shared'],
					data: 'data 1',
				},
			},
			{
				fields: {
					lookupField: ['other'],
					data: 'data 2',
				},
			},
			{
				fields: {
					lookupField: ['shared'],
					data: 'data 3',
				},
			},
		];

		const result = findMatches(
			data,
			['lookupField'],
			{
				lookupField: 'shared',
				data: 'updated',
			},
			true,
		);

		expect(result).toHaveLength(2);
		expect(result[0].fields.lookupField).toEqual(['shared']);
		expect(result[1].fields.lookupField).toEqual(['shared']);
	});
});

describe('test AirtableV2, valuesMatch', () => {
	it('should match identical scalar values', () => {
		expect(valuesMatch('foo', 'foo')).toBe(true);
	});

	it('should not match different scalar values', () => {
		expect(valuesMatch('foo', 'bar')).toBe(false);
	});

	it('should match when record value is an array containing the input value', () => {
		expect(valuesMatch(['foo'], 'foo')).toBe(true);
	});

	it('should match when record value is a multi-element array containing the input value', () => {
		expect(valuesMatch(['foo', 'bar'], 'foo')).toBe(true);
	});

	it('should not match when record value is an array not containing the input value', () => {
		expect(valuesMatch(['foo'], 'bar')).toBe(false);
	});

	it('should match identical arrays', () => {
		expect(valuesMatch(['foo', 'bar'], ['foo', 'bar'])).toBe(true);
	});

	it('should not match arrays with different lengths', () => {
		expect(valuesMatch(['foo'], ['foo', 'bar'])).toBe(false);
	});

	it('should not match arrays with different elements', () => {
		expect(valuesMatch(['foo', 'baz'], ['foo', 'bar'])).toBe(false);
	});

	it('should match identical numbers', () => {
		expect(valuesMatch(42, 42)).toBe(true);
	});

	it('should not match undefined values to a string', () => {
		expect(valuesMatch(undefined, 'foo')).toBe(false);
	});

	it('should match when both are undefined', () => {
		expect(valuesMatch(undefined, undefined)).toBe(true);
	});
});
