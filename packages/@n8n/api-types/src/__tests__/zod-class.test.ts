import { z } from 'zod';

import { Z } from '../zod-class';

describe('Z.array', () => {
	class TagIdDto extends Z.array(z.object({ id: z.string() })) {}

	it('exposes an array-rooted schema, not an object', () => {
		expect(TagIdDto.schema instanceof z.ZodArray).toBe(true);
	});

	it('parses a valid array', () => {
		expect(TagIdDto.parse([{ id: 'a' }, { id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }]);
	});

	it('parses an empty array', () => {
		expect(TagIdDto.parse([])).toEqual([]);
	});

	it('rejects a non-array payload via safeParse', () => {
		const result = TagIdDto.safeParse({ id: 'a' });
		expect(result.success).toBe(false);
	});

	it('rejects an array whose items are missing required fields', () => {
		const result = TagIdDto.safeParse([{}]);
		expect(result.success).toBe(false);
	});

	it('strips unknown fields off each array item, per the item schema', () => {
		const result = TagIdDto.safeParse([{ id: 'a', extra: 'nope' }]);
		expect(result).toMatchObject({ success: true, data: [{ id: 'a' }] });
	});

	it('keeps the declared class name for OpenAPI component naming', () => {
		expect(TagIdDto.name).toBe('TagIdDto');
	});

	describe('constructor', () => {
		it('yields a real array, not an object with numeric keys', () => {
			const dto = new TagIdDto([{ id: 'a' }, { id: 'b' }]);

			expect(Array.isArray(dto)).toBe(true);
			expect(dto).toEqual([{ id: 'a' }, { id: 'b' }]);
			expect(dto).toHaveLength(2);
		});

		it('supports array methods on the constructed value', () => {
			const dto = new TagIdDto([{ id: 'a' }, { id: 'b' }]);

			expect(dto.map((tag) => tag.id)).toEqual(['a', 'b']);
		});

		it('strips unknown fields off each item', () => {
			// @ts-expect-error deliberately passing a field the item schema does not declare
			const dto = new TagIdDto([{ id: 'a', extra: 'nope' }]);

			expect(dto).toEqual([{ id: 'a' }]);
		});

		it('throws on an invalid payload', () => {
			// @ts-expect-error deliberately passing a payload the schema rejects
			expect(() => new TagIdDto([{}])).toThrow(z.ZodError);
		});
	});
});
