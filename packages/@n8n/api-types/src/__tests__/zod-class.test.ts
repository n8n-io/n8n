import { z } from 'zod';

import { Z } from '../zod-class';

describe('Z.class', () => {
	const shape = { name: z.string() };

	it('strips an unknown key when no option is passed', () => {
		class LenientDto extends Z.class(shape) {}

		expect(LenientDto.parse({ name: 'a', extra: 1 })).toEqual({ name: 'a' });
	});

	it('rejects an unknown key at every entry point when strict', () => {
		class StrictDto extends Z.class(shape, { strict: true }) {}
		const payload = { name: 'a', extra: 1 };

		expect(StrictDto.safeParse(payload).success).toBe(false);
		expect(() => StrictDto.parse(payload)).toThrow(z.ZodError);
		expect(() => new StrictDto(payload)).toThrow(z.ZodError);
	});

	it('keeps strict through extend', () => {
		class ChildDto extends Z.class(shape, { strict: true }).extend({ age: z.number() }) {}

		expect(ChildDto.safeParse({ name: 'a', age: 1 }).success).toBe(true);
		expect(ChildDto.safeParse({ name: 'a', age: 1, extra: 1 }).success).toBe(false);
	});
});

describe('Z.array', () => {
	class TagIdDto extends Z.array(z.object({ id: z.string() })) {}

	it('exposes an array-rooted schema, not an object', () => {
		expect(TagIdDto.schema instanceof z.ZodArray).toBe(true);
	});

	it('parses a valid payload via the statics', () => {
		expect(TagIdDto.parse([{ id: 'a' }, { id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }]);
		expect(TagIdDto.safeParse([{ id: 'a' }])).toMatchObject({
			success: true,
			data: [{ id: 'a' }],
		});
	});

	it('parses an empty array', () => {
		expect(TagIdDto.parse([])).toEqual([]);
	});

	it('rejects an invalid payload via the statics', () => {
		expect(TagIdDto.safeParse({ id: 'a' }).success).toBe(false);
		expect(TagIdDto.safeParse([{}]).success).toBe(false);
		expect(() => TagIdDto.parse([{}])).toThrow(z.ZodError);
	});

	it('constructs a JavaScript array, not an object with numeric keys, and applies the schema', () => {
		const dto = new TagIdDto([{ id: 'a' }, { id: 'b' }]);

		expect(Array.isArray(dto)).toBe(true);
		expect(dto).toEqual([{ id: 'a' }, { id: 'b' }]);
		expect(dto).toHaveLength(2);
		expect(dto.map((tag) => tag.id)).toEqual(['a', 'b']);

		// @ts-expect-error deliberately passing a payload the schema rejects
		expect(() => new TagIdDto([{}])).toThrow(z.ZodError);
	});
});
